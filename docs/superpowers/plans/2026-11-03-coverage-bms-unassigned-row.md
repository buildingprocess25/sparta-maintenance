# Coverage BMS Unassigned Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Coverage BMS table on `/dashboard/preventive` shows the same branch totals as the summary card, with a "Belum di-assign BMS" row per branch. Deleting a BMS user automatically vacates that BMS's store assignments, and a one-off script cleans up assignments of already-deleted BMS.

**Architecture:** `getBmsCoverageHierarchy` starts from `Store` (active stores in scope) instead of `BmsStoreAssignment`, then hands stores and a per-store report map to a new pure function `buildCoverageHierarchy` in `app/dashboard/preventive/coverage-hierarchy.ts`. That function computes branch totals from unique stores and puts stores without assignments into a new `unassigned` field. The table renders that field with a new `UnassignedCoverageRows` component. Store vacating lives in a small helper, `lib/bms-store-assignment.ts`. Both user-delete server actions call it inside their transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, shadcn/ui, lucide-react, Node `node:assert/strict` specs run with `npx tsx`.

**Spec:** `docs/superpowers/specs/2026-11-03-coverage-bms-unassigned-row-design.md`

## Global Constraints

- Work directly on `main`. Do not create a branch or worktree.
- Commit messages: Conventional Commits, no `Co-Authored-By` / "Generated with" lines.
- No change to `prisma/schema.prisma` and no migration.
- The pre-commit hook (`.githooks/pre-commit`) blocks commits of non-docs files unless a dated task note `docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md` is staged. Task 1 creates the note. Every later task updates it and stages it with its commit. Never use `--no-verify`.
- Task notes must not contain personal data, production records, or raw query output.
- Do not add manual spacing (padding/gap/margin) to shadcn components themselves; follow the existing classes in `bms-coverage-hierarchy-table.tsx`.
- UI copy (verbatim): row label `Belum di-assign BMS`; subtitle `Toko aktif tanpa BMS penanggung jawab`; detail title `Toko Belum Di-assign ({n} Toko)`; column header `Dikerjakan oleh`.
- Assignment note when a BMS user is deleted: `User BMS dihapus`. Note used by the cleanup script: `Pembersihan: BMS sudah dihapus`.
- Never run `npm run vacate:deleted-bms:execute` as part of this plan. Running it is a separate decision for the user after reviewing the dry-run output.

---

### Task 1: Pure coverage hierarchy builder

**Files:**
- Create: `app/dashboard/preventive/coverage-hierarchy.ts`
- Test: `app/dashboard/preventive/coverage-hierarchy.spec.ts`
- Create: `docs/agent-notes/<YYYY-MM-DD-HHMM>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: nothing.
- Produces (exported from `app/dashboard/preventive/coverage-hierarchy.ts`):
  - types `StoreCoverageHierarchyItem`, `BmsCoverageHierarchyItem`, `UnassignedStoreItem`, `UnassignedCoverage`, `BranchCoverageHierarchy`, `CoverageStoreInput`, `CoverageReportInfo` (exact shapes in Step 3)
  - `buildCoverageHierarchy(stores: CoverageStoreInput[], reportByStore: Map<string, CoverageReportInfo>): BranchCoverageHierarchy[]`

- [ ] **Step 1: Write the failing test**

Create `app/dashboard/preventive/coverage-hierarchy.spec.ts`:

```ts
import assert from "node:assert/strict";
import {
    buildCoverageHierarchy,
    type CoverageReportInfo,
    type CoverageStoreInput,
} from "./coverage-hierarchy";

const stores: CoverageStoreInput[] = [
    {
        code: "T001",
        name: "Toko Bravo",
        branchName: "CIANJUR",
        assignments: [{ bmsNIK: "111", bmsName: "Andi" }],
    },
    {
        code: "T002",
        name: "Toko Alpha",
        branchName: "CIANJUR",
        // Assignment ganda: muncul di dua BMS, tapi dihitung sekali di cabang
        assignments: [
            { bmsNIK: "111", bmsName: "Andi" },
            { bmsNIK: "222", bmsName: "Budi" },
        ],
    },
    { code: "T003", name: "Toko Delta", branchName: "CIANJUR", assignments: [] },
    { code: "T004", name: "Toko Charlie", branchName: "CIANJUR", assignments: [] },
    {
        code: "B001",
        name: "Toko Bogor",
        branchName: "BOGOR",
        assignments: [{ bmsNIK: "333", bmsName: null }],
    },
    { code: "S001", name: "Toko Sukabumi", branchName: "SUKABUMI", assignments: [] },
];

const reports = new Map<string, CoverageReportInfo>([
    ["T002", { reportNumber: "R-T002", doneAt: "2026-10-05T03:00:00.000Z", doneByName: "Andi" }],
    ["T004", { reportNumber: "R-T004", doneAt: "2026-10-06T03:00:00.000Z", doneByName: "Citra" }],
    ["B001", { reportNumber: "R-B001", doneAt: "2026-10-07T03:00:00.000Z", doneByName: "Dedi" }],
]);

const result = buildCoverageHierarchy(stores, reports);

// Cabang diurutkan per nama
assert.deepEqual(
    result.map((b) => b.branchName),
    ["BOGOR", "CIANJUR", "SUKABUMI"],
);

// CIANJUR: total dari toko unik (4), bukan penjumlahan BMS (2 + 1 + 2 = 5)
const cianjur = result.find((b) => b.branchName === "CIANJUR")!;
assert.deepEqual(
    [cianjur.bmsCount, cianjur.totalStores, cianjur.completedStores, cianjur.pendingStores, cianjur.coverageRate],
    [2, 4, 2, 2, 50],
);

// Angka per BMS tetap seperti sebelumnya; toko ganda ada di kedua BMS
assert.deepEqual(
    cianjur.bmsList.map((b) => [b.nik, b.name, b.totalStores, b.completedStores, b.pendingStores, b.kpiRate]),
    [
        ["111", "Andi", 2, 1, 1, 50],
        ["222", "Budi", 1, 1, 0, 100],
    ],
);
assert.deepEqual(
    cianjur.bmsList[0].stores.map((s) => s.storeCode),
    ["T002", "T001"],
);

// Toko tanpa assignment masuk unassigned, diurutkan per nama toko
assert.ok(cianjur.unassigned);
assert.deepEqual(
    [
        cianjur.unassigned.totalStores,
        cianjur.unassigned.completedStores,
        cianjur.unassigned.pendingStores,
        cianjur.unassigned.coverageRate,
    ],
    [2, 1, 1, 50],
);
assert.deepEqual(
    cianjur.unassigned.stores.map((s) => [s.storeCode, s.isCompleted, s.reportNumber ?? null, s.doneByName ?? null]),
    [
        ["T004", true, "R-T004", "Citra"],
        ["T003", false, null, null],
    ],
);

// BOGOR: semua toko ter-assign → unassigned null; nama BMS fallback ke NIK
const bogor = result.find((b) => b.branchName === "BOGOR")!;
assert.equal(bogor.unassigned, null);
assert.equal(bogor.bmsList[0].name, "333");
assert.deepEqual([bogor.totalStores, bogor.completedStores, bogor.coverageRate], [1, 1, 100]);

// SUKABUMI: cabang tanpa assignment sama sekali tetap muncul
const sukabumi = result.find((b) => b.branchName === "SUKABUMI")!;
assert.deepEqual(
    [sukabumi.bmsCount, sukabumi.bmsList.length, sukabumi.totalStores, sukabumi.pendingStores, sukabumi.coverageRate],
    [0, 0, 1, 1, 0],
);
assert.equal(sukabumi.unassigned?.totalStores, 1);

// Input kosong
assert.deepEqual(buildCoverageHierarchy([], new Map()), []);

console.log("coverage-hierarchy assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`
Expected: FAIL with an error like `Cannot find module './coverage-hierarchy'`.

- [ ] **Step 3: Write the implementation**

Create `app/dashboard/preventive/coverage-hierarchy.ts`:

```ts
export type StoreCoverageHierarchyItem = {
    storeCode: string;
    storeName: string;
    isCompleted: boolean;
    doneAt?: string;
    reportNumber?: string;
};

export type BmsCoverageHierarchyItem = {
    nik: string;
    name: string;
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    kpiRate: number;
    stores: StoreCoverageHierarchyItem[];
};

export type UnassignedStoreItem = StoreCoverageHierarchyItem & {
    // Nama pembuat laporan preventif terbaru di kuartal
    doneByName?: string;
};

export type UnassignedCoverage = {
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    stores: UnassignedStoreItem[];
};

export type BranchCoverageHierarchy = {
    branchName: string;
    bmsCount: number;
    // Dihitung dari toko aktif unik di cabang (termasuk unassigned)
    totalStores: number;
    completedStores: number;
    pendingStores: number;
    coverageRate: number;
    bmsList: BmsCoverageHierarchyItem[];
    // null jika semua toko cabang sudah ter-assign
    unassigned: UnassignedCoverage | null;
};

export type CoverageStoreInput = {
    code: string;
    name: string;
    branchName: string;
    assignments: { bmsNIK: string; bmsName: string | null }[];
};

export type CoverageReportInfo = {
    reportNumber: string;
    doneAt: string;
    doneByName: string;
};

function toRate(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
}

export function buildCoverageHierarchy(
    stores: CoverageStoreInput[],
    reportByStore: Map<string, CoverageReportInfo>,
): BranchCoverageHierarchy[] {
    type BmsAccumulator = {
        nik: string;
        name: string;
        stores: StoreCoverageHierarchyItem[];
    };
    type BranchAccumulator = {
        bmsMap: Map<string, BmsAccumulator>;
        totalStores: number;
        completedStores: number;
        unassignedStores: UnassignedStoreItem[];
    };

    const branchMap = new Map<string, BranchAccumulator>();

    for (const store of stores) {
        const branchName = store.branchName || "TANPA CABANG";
        let branch = branchMap.get(branchName);
        if (!branch) {
            branch = {
                bmsMap: new Map(),
                totalStores: 0,
                completedStores: 0,
                unassignedStores: [],
            };
            branchMap.set(branchName, branch);
        }

        const report = reportByStore.get(store.code);
        const item: StoreCoverageHierarchyItem = {
            storeCode: store.code,
            storeName: store.name,
            isCompleted: !!report,
            doneAt: report?.doneAt,
            reportNumber: report?.reportNumber,
        };

        // Total cabang dihitung per toko, bukan per assignment
        branch.totalStores += 1;
        if (report) branch.completedStores += 1;

        if (store.assignments.length === 0) {
            branch.unassignedStores.push({ ...item, doneByName: report?.doneByName });
            continue;
        }

        for (const assignment of store.assignments) {
            let bms = branch.bmsMap.get(assignment.bmsNIK);
            if (!bms) {
                bms = {
                    nik: assignment.bmsNIK,
                    name: assignment.bmsName || assignment.bmsNIK,
                    stores: [],
                };
                branch.bmsMap.set(assignment.bmsNIK, bms);
            }
            // Hindari duplikasi store per BMS
            if (!bms.stores.some((s) => s.storeCode === store.code)) {
                bms.stores.push(item);
            }
        }
    }

    const results: BranchCoverageHierarchy[] = [];

    for (const [branchName, branch] of branchMap.entries()) {
        const bmsList: BmsCoverageHierarchyItem[] = [];

        for (const bms of branch.bmsMap.values()) {
            bms.stores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            const totalStores = bms.stores.length;
            const completedStores = bms.stores.filter((s) => s.isCompleted).length;

            bmsList.push({
                nik: bms.nik,
                name: bms.name,
                totalStores,
                completedStores,
                pendingStores: Math.max(0, totalStores - completedStores),
                kpiRate: toRate(completedStores, totalStores),
                stores: bms.stores,
            });
        }

        bmsList.sort((a, b) => a.name.localeCompare(b.name));

        let unassigned: UnassignedCoverage | null = null;
        if (branch.unassignedStores.length > 0) {
            branch.unassignedStores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            const totalStores = branch.unassignedStores.length;
            const completedStores = branch.unassignedStores.filter((s) => s.isCompleted).length;
            unassigned = {
                totalStores,
                completedStores,
                pendingStores: Math.max(0, totalStores - completedStores),
                coverageRate: toRate(completedStores, totalStores),
                stores: branch.unassignedStores,
            };
        }

        results.push({
            branchName,
            bmsCount: bmsList.length,
            totalStores: branch.totalStores,
            completedStores: branch.completedStores,
            pendingStores: Math.max(0, branch.totalStores - branch.completedStores),
            coverageRate: toRate(branch.completedStores, branch.totalStores),
            bmsList,
            unassigned,
        });
    }

    results.sort((a, b) => a.branchName.localeCompare(b.branchName));

    return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`
Expected: PASS, printing `coverage-hierarchy assertions passed`.

- [ ] **Step 5: Create the task note**

Get the Jakarta timestamp: `powershell -Command "[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId((Get-Date), 'SE Asia Standard Time').ToString('yyyy-MM-dd-HHmm')"`. Create `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md` from `docs/agent-notes/TEMPLATE.md`:

```markdown
# Coverage BMS Unassigned Row & Vacate on BMS Delete

## Scope

Tabel Coverage BMS di `/dashboard/preventive` menampilkan total cabang yang sama
dengan card, plus baris "Belum di-assign BMS". Hapus user BMS otomatis
mengosongkan assignment tokonya. Tidak ada perubahan schema.

## Context and Sources

- Spec: `docs/superpowers/specs/2026-11-03-coverage-bms-unassigned-row-design.md`
- Plan: `docs/superpowers/plans/2026-11-03-coverage-bms-unassigned-row.md`
- Catatan terkait: `docs/agent-notes/2026-10-09-1342-sync-active-stores-bms-coverage.md`

## Changed Files

- `app/dashboard/preventive/coverage-hierarchy.ts`: fungsi murni `buildCoverageHierarchy` dan tipe hierarki coverage.
- `app/dashboard/preventive/coverage-hierarchy.spec.ts`: spec fungsi murni.

## Decisions

- Total cabang dihitung dari toko unik agar sama dengan card dan tidak dobel hitung toko ber-assignment ganda.

## Verification

- `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`: lulus.

## Remaining Work and Risks

- Task 2–6 di plan belum dikerjakan.
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/preventive/coverage-hierarchy.ts app/dashboard/preventive/coverage-hierarchy.spec.ts docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "feat(preventive): add pure coverage hierarchy builder"
```

---

### Task 2: Store-first query in `getBmsCoverageHierarchy`

**Files:**
- Modify: `app/dashboard/preventive/coverage-hierarchy-action.ts` (whole file)
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx:26` (type import)
- Modify: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx:32` (type import)
- Modify: `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: `buildCoverageHierarchy`, `BranchCoverageHierarchy`, `CoverageReportInfo` from `./coverage-hierarchy` (Task 1).
- Produces: `getBmsCoverageHierarchy(params?: { year?: number; quarter?: 1 | 2 | 3 | 4; branchName?: string; brand?: StoreBrandFilter }): Promise<BranchCoverageHierarchy[]>`. The signature is unchanged and every branch now carries `unassigned`. The types now come from `app/dashboard/preventive/coverage-hierarchy.ts`, and the action file no longer exports types.

- [ ] **Step 1: Replace the action file**

Replace the full content of `app/dashboard/preventive/coverage-hierarchy-action.ts` with:

```ts
"use server";

import prisma from "@/lib/prisma";
import { getJakartaQuarterWindow, getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { type StoreBrandFilter, getStoreBrandWhere } from "@/lib/store-brand-filter";
import { isRecordedPreventiveReport } from "@/lib/report-preventive";
import {
    buildCoverageHierarchy,
    type BranchCoverageHierarchy,
    type CoverageReportInfo,
} from "./coverage-hierarchy";

export async function getBmsCoverageHierarchy(params?: {
    year?: number;
    quarter?: 1 | 2 | 3 | 4;
    branchName?: string;
    brand?: StoreBrandFilter;
}): Promise<BranchCoverageHierarchy[]> {
    const year = params?.year ?? getJakartaYear();
    const quarter = params?.quarter ?? getJakartaCurrentQuarter();
    const branchFilter = params?.branchName?.trim();
    const brandFilter = params?.brand ?? "ALL";

    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);

    // Filter brand toko jika ada
    const brandWhere =
        brandFilter && brandFilter !== "ALL"
            ? getStoreBrandWhere(brandFilter)
            : {};

    // 1. Ambil semua toko aktif (sama dengan populasi card) beserta penugasan aktifnya
    const stores = await prisma.store.findMany({
        where: {
            isActive: true,
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
                ...(branchFilter && branchFilter !== "all"
                    ? { equals: branchFilter }
                    : {}),
            },
            ...brandWhere,
        },
        select: {
            code: true,
            name: true,
            branchName: true,
            storeAssignments: {
                where: { isActive: true },
                select: {
                    bmsNIK: true,
                    bms: { select: { name: true } },
                },
            },
        },
    });

    if (stores.length === 0) {
        return [];
    }

    // 2. Query laporan preventif selesai pada kuartal tersebut
    const completedReports = await prisma.report.findMany({
        where: {
            storeCode: { in: stores.map((s) => s.code) },
            createdAt: {
                gte: start,
                lt: endExclusive,
            },
            status: { not: "DRAFT" },
        },
        select: {
            storeCode: true,
            reportNumber: true,
            createdAt: true,
            status: true,
            items: true,
            createdByNIK: true,
            createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const reportByStore = new Map<string, CoverageReportInfo>();
    for (const rep of completedReports) {
        if (!rep.storeCode || !isRecordedPreventiveReport(rep)) continue;
        const existing = reportByStore.get(rep.storeCode);
        if (!existing || rep.createdAt > new Date(existing.doneAt)) {
            reportByStore.set(rep.storeCode, {
                reportNumber: rep.reportNumber,
                doneAt: rep.createdAt.toISOString(),
                doneByName: rep.createdBy?.name || rep.createdByNIK,
            });
        }
    }

    // 3. Kelompokkan Cabang -> BMS -> Toko, toko tanpa BMS ke grup unassigned
    return buildCoverageHierarchy(
        stores.map((s) => ({
            code: s.code,
            name: s.name,
            branchName: s.branchName,
            assignments: s.storeAssignments.map((a) => ({
                bmsNIK: a.bmsNIK,
                bmsName: a.bms?.name ?? null,
            })),
        })),
        reportByStore,
    );
}
```

- [ ] **Step 2: Update type imports in the two components**

In `app/dashboard/preventive/_components/admin-preventive-table.tsx`, replace:

```ts
import type { BranchCoverageHierarchy } from "../coverage-hierarchy-action";
```

with:

```ts
import type { BranchCoverageHierarchy } from "../coverage-hierarchy";
```

In `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`, make the same replacement.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `app/dashboard/preventive/**`. If the project has unrelated pre-existing errors, confirm none of them point at the files touched in this task.

Run: `npm run lint`
Expected: no new errors in the touched files.

Run: `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`
Expected: PASS.

- [ ] **Step 4: Update the task note**

In the note, add these lines to `## Changed Files`:

```markdown
- `app/dashboard/preventive/coverage-hierarchy-action.ts`: query berangkat dari `Store` aktif + assignment aktif, laporan ikut membawa nama pembuat.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`, `bms-coverage-hierarchy-table.tsx`: import tipe dari `../coverage-hierarchy`.
```

Add `npx tsc --noEmit` and `npm run lint` results under `## Verification`, and change Remaining Work to `Task 3–6`.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/preventive/coverage-hierarchy-action.ts app/dashboard/preventive/_components/admin-preventive-table.tsx app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "feat(preventive): count coverage from all active stores"
```

---

### Task 3: "Belum di-assign BMS" rows in the table

**Files:**
- Create: `app/dashboard/preventive/_components/unassigned-coverage-rows.tsx`
- Modify: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx:790-796`
- Modify: `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: `UnassignedCoverage`, `BranchCoverageHierarchy` from `../coverage-hierarchy` (Task 1); `branch.unassigned` populated by Task 2.
- Produces: `UnassignedCoverageRows(props: { branchName: string; unassigned: UnassignedCoverage; isExpanded: boolean; onToggle: () => void; canManageStores: boolean })` and a new `canManageStores?: boolean` prop on `BmsCoverageHierarchyTable`.

- [ ] **Step 1: Create the rows component**

Create `app/dashboard/preventive/_components/unassigned-coverage-rows.tsx`:

```tsx
"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2, Clock, ExternalLink, UserX } from "lucide-react";
import type { UnassignedCoverage } from "../coverage-hierarchy";

type Props = {
    branchName: string;
    unassigned: UnassignedCoverage;
    isExpanded: boolean;
    onToggle: () => void;
    canManageStores: boolean;
};

export function UnassignedCoverageRows({
    branchName,
    unassigned,
    isExpanded,
    onToggle,
    canManageStores,
}: Props) {
    return (
        <>
            <TableRow
                className="bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 cursor-pointer border-b"
                onClick={onToggle}
            >
                <TableCell className="py-2.5 pl-8">
                    <div className="flex items-center gap-2">
                        <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                isExpanded ? "rotate-90 text-amber-600" : ""
                            }`}
                        />
                        <UserX className="w-4 h-4 text-amber-600" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-amber-800 dark:text-amber-300">
                                Belum di-assign BMS
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Toko aktif tanpa BMS penanggung jawab
                            </span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="text-center">{unassigned.totalStores}</TableCell>
                <TableCell className="text-center text-emerald-600 font-medium">
                    {unassigned.completedStores}
                </TableCell>
                <TableCell className="text-center text-amber-600 font-medium">
                    {unassigned.pendingStores}
                </TableCell>
                <TableCell>
                    <Badge
                        variant="outline"
                        className={`text-xs ${
                            unassigned.coverageRate >= 100
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : unassigned.coverageRate >= 50
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                        Pencapaian: {unassigned.coverageRate}%
                    </Badge>
                </TableCell>
            </TableRow>

            {isExpanded && (
                <TableRow className="bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50/40">
                    <TableCell colSpan={5} className="p-3 pl-12 pr-6">
                        <div className="bg-background rounded-lg border p-3 shadow-sm space-y-2">
                            <div className="border-b pb-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Toko Belum Di-assign ({unassigned.stores.length} Toko)
                                </span>
                            </div>

                            <div className="rounded border overflow-hidden">
                                <Table
                                    className="text-xs"
                                    containerClassName="max-h-[300px] overflow-y-auto"
                                >
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[110px]">Kode Toko</TableHead>
                                            <TableHead>Nama Toko</TableHead>
                                            <TableHead className="w-[140px]">Status Preventif</TableHead>
                                            <TableHead className="w-[180px]">Dikerjakan oleh</TableHead>
                                            <TableHead className="w-[180px]">No. Laporan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unassigned.stores.map((s) => (
                                            <TableRow key={s.storeCode} className="hover:bg-slate-50/70">
                                                <TableCell className="font-mono font-medium">
                                                    {canManageStores ? (
                                                        <Link
                                                            href={`/dashboard/stores?search=${encodeURIComponent(
                                                                s.storeCode,
                                                            )}&branch=${encodeURIComponent(branchName)}`}
                                                            className="text-primary hover:underline inline-flex items-center gap-1"
                                                            target="_blank"
                                                        >
                                                            {s.storeCode}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    ) : (
                                                        s.storeCode
                                                    )}
                                                </TableCell>
                                                <TableCell>{s.storeName}</TableCell>
                                                <TableCell>
                                                    {s.isCompleted ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Selesai
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px]"
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {s.doneByName ?? (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {s.reportNumber ? (
                                                        <Link
                                                            href={`/dashboard/reports/${s.reportNumber}`}
                                                            className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                                                            target="_blank"
                                                        >
                                                            {s.reportNumber}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
```

- [ ] **Step 2: Add the prop and import in the table**

In `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`:

Below the line `import type { BranchCoverageHierarchy } from "../coverage-hierarchy";`, add:

```ts
import { UnassignedCoverageRows } from "./unassigned-coverage-rows";
```

Replace the `Props` type and the component signature:

```ts
type Props = {
    initialHierarchy: BranchCoverageHierarchy[];
    defaultBranch?: string;
    isBmc?: boolean;
    quarter?: number;
    year?: number;
};

export function BmsCoverageHierarchyTable({
    initialHierarchy,
    defaultBranch,
    isBmc = false,
    quarter,
    year,
}: Props) {
```

with:

```ts
type Props = {
    initialHierarchy: BranchCoverageHierarchy[];
    defaultBranch?: string;
    isBmc?: boolean;
    // Admin/BMC: kode toko unassigned jadi tautan ke Data Toko
    canManageStores?: boolean;
    quarter?: number;
    year?: number;
};

export function BmsCoverageHierarchyTable({
    initialHierarchy,
    defaultBranch,
    isBmc = false,
    canManageStores = false,
    quarter,
    year,
}: Props) {
```

- [ ] **Step 3: Include unassigned stores in search**

In the same file, inside `filteredHierarchy`'s `.map((branch) => { ... })`, replace:

```ts
                    if (branchMatch || matchedBmsList.length > 0) {
                        return {
                            ...branch,
                            bmsList: matchedBmsList,
                        };
                    }
                    return null;
```

with:

```ts
                    const matchedUnassignedStores =
                        branch.unassigned?.stores.filter(
                            (s) =>
                                s.storeName.toLowerCase().includes(query) ||
                                s.storeCode.toLowerCase().includes(query),
                        ) ?? [];

                    const unassigned =
                        branch.unassigned &&
                        (branchMatch || matchedUnassignedStores.length > 0)
                            ? {
                                  ...branch.unassigned,
                                  stores: branchMatch
                                      ? branch.unassigned.stores
                                      : matchedUnassignedStores,
                              }
                            : null;

                    if (branchMatch || matchedBmsList.length > 0 || unassigned) {
                        return {
                            ...branch,
                            bmsList: matchedBmsList,
                            unassigned,
                        };
                    }
                    return null;
```

The sort block below it sorts only `bmsList` and spreads `...branch`, so `unassigned` passes through unchanged and needs no edit.

- [ ] **Step 4: Render the unassigned rows after the BMS rows**

In the same file, find the end of the level-2 BMS map. Replace:

```tsx
                                                    </Fragment>
                                                );
                                            })}
                                    </Fragment>
                                );
                            })
```

with:

```tsx
                                                    </Fragment>
                                                );
                                            })}

                                        {/* LEVEL 2b: Toko tanpa BMS, selalu paling bawah */}
                                        {isBranchExpanded && branch.unassigned && (
                                            <UnassignedCoverageRows
                                                branchName={branch.branchName}
                                                unassigned={branch.unassigned}
                                                isExpanded={
                                                    expandedBms.has(`unassigned:${branch.branchName}`) ||
                                                    !!search.trim()
                                                }
                                                onToggle={() => toggleBms(`unassigned:${branch.branchName}`)}
                                                canManageStores={canManageStores}
                                            />
                                        )}
                                    </Fragment>
                                );
                            })
```

- [ ] **Step 5: Pass `canManageStores` from the parent**

In `app/dashboard/preventive/_components/admin-preventive-table.tsx`, replace:

```tsx
                        <BmsCoverageHierarchyTable
                            initialHierarchy={coverageHierarchyData}
                            defaultBranch={branchName}
                            isBmc={isBmc}
                            quarter={quarter}
                            year={year}
                        />
```

with:

```tsx
                        <BmsCoverageHierarchyTable
                            initialHierarchy={coverageHierarchyData}
                            defaultBranch={branchName}
                            isBmc={isBmc}
                            canManageStores={showBranchControls || isBmc}
                            quarter={quarter}
                            year={year}
                        />
```

(`showBranchControls` is `isAdmin` from `app/dashboard/preventive/page.tsx`. Admin and BMC are the only roles allowed on `/dashboard/stores`.)

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in the touched files.

Run: `npm run lint`
Expected: no new errors in the touched files.

- [ ] **Step 7: Verify in the browser**

Start the dev server (`.claude/launch.json` / `npm run dev`), sign in as an Admin test user, and open `/dashboard/preventive?branch=CIANJUR&quarter=4&year=2026` (or select CIANJUR, Triwulan 4, 2026 in the filters). Check:
- The CIANJUR branch row numbers equal the card (Target / Sudah / Belum).
- The last row under CIANJUR is "Belum di-assign BMS". Its Target equals card target minus the sum of distinct assigned stores. When opened, it lists stores with "Dikerjakan oleh" filled only for "Selesai" rows.
- Store codes in that list link to `/dashboard/stores?search=<kode>&branch=CIANJUR`.
- Typing an unassigned store code in the table search shows only that store under "Belum di-assign BMS".
- Sorting "Terendah Dulu" / "Tertinggi Dulu" keeps "Belum di-assign BMS" as the last row in the branch.
- With a BNM test user, store codes in the unassigned list are plain text.

- [ ] **Step 8: Update the task note and commit**

In the note, add to `## Changed Files`:

```markdown
- `app/dashboard/preventive/_components/unassigned-coverage-rows.tsx`: baris "Belum di-assign BMS" dan rincian tokonya.
- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: prop `canManageStores`, pencarian toko unassigned, render baris unassigned.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: kirim `canManageStores` (Admin/BMC).
```

Add the browser check outcomes under `## Verification`. Use counts only, no store names.

```bash
git add app/dashboard/preventive/_components/unassigned-coverage-rows.tsx app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx app/dashboard/preventive/_components/admin-preventive-table.tsx docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "feat(preventive): show unassigned stores in coverage table"
```

---

### Task 4: Vacate store assignments when a BMS user is deleted

**Files:**
- Create: `lib/bms-store-assignment.ts`
- Test: `lib/bms-store-assignment.spec.ts`
- Modify: `app/admin/database/actions.ts` (`adminDeleteUser`, around lines 368–394)
- Modify: `app/bmc/database/actions.ts` (`deleteUser`, around lines 253–279)
- Modify: `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: `Prisma.TransactionClient` from `@prisma/client`.
- Produces: `BMS_DELETED_ASSIGNMENT_NOTE = "User BMS dihapus"` and `vacateBmsAssignments(db: Prisma.TransactionClient, bmsNIK: string, actorNIK: string): Promise<{ count: number }>`.

- [ ] **Step 1: Write the failing test**

Create `lib/bms-store-assignment.spec.ts`:

```ts
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { BMS_DELETED_ASSIGNMENT_NOTE, vacateBmsAssignments } from "./bms-store-assignment";

async function main() {
    let captured: { where: unknown; data: Record<string, unknown> } | null = null;
    const fakeDb = {
        bmsStoreAssignment: {
            updateMany: async (args: { where: unknown; data: Record<string, unknown> }) => {
                captured = args;
                return { count: 3 };
            },
        },
    } as unknown as Prisma.TransactionClient;

    const before = Date.now();
    const result = await vacateBmsAssignments(fakeDb, "BMS001", "ADM001");

    assert.equal(BMS_DELETED_ASSIGNMENT_NOTE, "User BMS dihapus");
    assert.deepEqual(result, { count: 3 });
    assert.ok(captured);
    const args = captured as { where: unknown; data: Record<string, unknown> };
    assert.deepEqual(args.where, { bmsNIK: "BMS001", isActive: true });
    assert.equal(args.data.isActive, false);
    assert.equal(args.data.unassignedByNIK, "ADM001");
    assert.equal(args.data.notes, "User BMS dihapus");
    assert.ok(args.data.unassignedAt instanceof Date);
    assert.ok((args.data.unassignedAt as Date).getTime() >= before);

    console.log("bms-store-assignment assertions passed");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/bms-store-assignment.spec.ts`
Expected: FAIL with an error like `Cannot find module './bms-store-assignment'`.

- [ ] **Step 3: Write the helper**

Create `lib/bms-store-assignment.ts`:

```ts
import type { Prisma } from "@prisma/client";

export const BMS_DELETED_ASSIGNMENT_NOTE = "User BMS dihapus";

/**
 * Nonaktifkan semua penugasan toko aktif milik BMS (toko jadi vacant).
 * Dipanggil di dalam transaksi hapus user agar keduanya atomik.
 */
export function vacateBmsAssignments(
    db: Prisma.TransactionClient,
    bmsNIK: string,
    actorNIK: string,
) {
    return db.bmsStoreAssignment.updateMany({
        where: { bmsNIK, isActive: true },
        data: {
            isActive: false,
            unassignedAt: new Date(),
            unassignedByNIK: actorNIK,
            notes: BMS_DELETED_ASSIGNMENT_NOTE,
        },
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/bms-store-assignment.spec.ts`
Expected: PASS, printing `bms-store-assignment assertions passed`.

- [ ] **Step 5: Use it in `adminDeleteUser`**

In `app/admin/database/actions.ts`, add the import next to the other `@/lib/...` imports at the top:

```ts
import { vacateBmsAssignments } from "@/lib/bms-store-assignment";
```

In `adminDeleteUser`, replace:

```ts
        await prisma.$transaction([
            prisma.userPresence.deleteMany({ where: { userId: NIK } }),
            prisma.user.update({
                where: { NIK },
                data: {
                    deletedAt: new Date(),
                    deletedByNIK: admin.NIK,
                    passwordHash: null,
                    mustChangePassword: true,
                },
            }),
        ]);
```

with:

```ts
        const vacatedAssignments = await prisma.$transaction(async (tx) => {
            await tx.userPresence.deleteMany({ where: { userId: NIK } });
            await tx.user.update({
                where: { NIK },
                data: {
                    deletedAt: new Date(),
                    deletedByNIK: admin.NIK,
                    passwordHash: null,
                    mustChangePassword: true,
                },
            });
            // Toko milik BMS yang dihapus otomatis jadi vacant
            if (existing.role !== "BMS") return 0;
            const { count } = await vacateBmsAssignments(tx, NIK, admin.NIK);
            return count;
        });
```

Then in the success `logger.info` of the same function, replace:

```ts
                targetRole: existing.role,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin deleted user",
```

with:

```ts
                targetRole: existing.role,
                vacatedAssignments,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin deleted user",
```

- [ ] **Step 6: Use it in BMC `deleteUser`**

In `app/bmc/database/actions.ts`, add the import next to the other `@/lib/...` imports at the top:

```ts
import { vacateBmsAssignments } from "@/lib/bms-store-assignment";
```

In `deleteUser`, replace:

```ts
        await prisma.$transaction([
            prisma.userPresence.deleteMany({ where: { userId: NIK } }),
            prisma.user.update({
                where: { NIK },
                data: {
                    deletedAt: new Date(),
                    deletedByNIK: user.NIK,
                    passwordHash: null,
                    mustChangePassword: true,
                },
            }),
        ]);
```

with:

```ts
        const vacatedAssignments = await prisma.$transaction(async (tx) => {
            await tx.userPresence.deleteMany({ where: { userId: NIK } });
            await tx.user.update({
                where: { NIK },
                data: {
                    deletedAt: new Date(),
                    deletedByNIK: user.NIK,
                    passwordHash: null,
                    mustChangePassword: true,
                },
            });
            // Toko milik BMS yang dihapus otomatis jadi vacant
            if (existingUser.role !== "BMS") return 0;
            const { count } = await vacateBmsAssignments(tx, NIK, user.NIK);
            return count;
        });
```

Then in the success `logger.info` of the same function, replace:

```ts
                operation: "deleteUser",
                targetNIK: NIK,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "User deleted",
```

with:

```ts
                operation: "deleteUser",
                targetNIK: NIK,
                vacatedAssignments,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "User deleted",
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `lib/bms-store-assignment.ts`, `app/admin/database/actions.ts`, `app/bmc/database/actions.ts`.

Run: `npm run lint`
Expected: no new errors in the touched files.

- [ ] **Step 8: Verify manually against a local/test database**

Do this only when `DATABASE_URL` points at a local or test database, never production. If only production is configured, skip it and record "manual delete check not run: no test DB" in the task note.

1. Create a throwaway BMS user (`npm run create-user`) and assign two stores to it via `/dashboard/stores`.
2. Delete it from `/dashboard/users` as Admin.
3. In `npm run db:studio`, confirm both `BmsStoreAssignment` rows have `isActive = false`, `notes = "User BMS dihapus"`, and `unassignedByNIK` = the admin NIK.
4. Delete a non-BMS throwaway user and confirm no assignment rows changed.

- [ ] **Step 9: Update the task note and commit**

In the note, add to `## Changed Files`:

```markdown
- `lib/bms-store-assignment.ts` (+ spec): helper `vacateBmsAssignments`.
- `app/admin/database/actions.ts` (`adminDeleteUser`), `app/bmc/database/actions.ts` (`deleteUser`): hapus user BMS menonaktifkan assignment tokonya dalam transaksi yang sama.
```

Add to `## Decisions`: `Transaksi hapus user diubah ke bentuk interactive agar jumlah assignment yang dikosongkan bisa dicatat di log.` Add the spec and manual-check results under `## Verification`.

```bash
git add lib/bms-store-assignment.ts lib/bms-store-assignment.spec.ts app/admin/database/actions.ts app/bmc/database/actions.ts docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "feat(users): vacate store assignments when bms deleted"
```

---

### Task 5: Cleanup script for already-deleted BMS

**Files:**
- Create: `scripts/vacate-deleted-bms-assignments.ts`
- Modify: `package.json` (scripts)
- Modify: `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: `prisma` default export from `lib/prisma`.
- Produces: npm scripts `vacate:deleted-bms` (dry-run) and `vacate:deleted-bms:execute`.

- [ ] **Step 1: Write the script**

Create `scripts/vacate-deleted-bms-assignments.ts`:

```ts
import prisma from "../lib/prisma";

const EXECUTE = process.argv.includes("--execute");
const CLEANUP_NOTE = "Pembersihan: BMS sudah dihapus";

async function run() {
    console.log(
        EXECUTE
            ? "⚠️  MODE EXECUTE: assignment milik BMS terhapus akan dinonaktifkan."
            : "🔍 MODE DRY-RUN: tidak ada data yang diubah.",
    );

    const assignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            isActive: true,
            bms: { deletedAt: { not: null } },
        },
        orderBy: [{ bmsNIK: "asc" }, { storeCode: "asc" }],
        select: {
            id: true,
            storeCode: true,
            bmsNIK: true,
            bms: {
                select: { name: true, branchNames: true, deletedAt: true },
            },
        },
    });

    if (assignments.length === 0) {
        console.log("✅ Tidak ada assignment aktif milik BMS yang sudah dihapus.");
        return;
    }

    const byBms = new Map<
        string,
        { NIK: string; Nama: string; Cabang: string; Toko: number; Dihapus: string }
    >();
    for (const a of assignments) {
        const row = byBms.get(a.bmsNIK) ?? {
            NIK: a.bmsNIK,
            Nama: a.bms.name,
            Cabang: a.bms.branchNames.join(", "),
            Toko: 0,
            Dihapus: a.bms.deletedAt?.toISOString().slice(0, 10) ?? "-",
        };
        row.Toko += 1;
        byBms.set(a.bmsNIK, row);
    }

    console.table(Array.from(byBms.values()));
    console.log(
        `Total: ${assignments.length} assignment aktif dari ${byBms.size} BMS yang sudah dihapus.`,
    );

    if (!EXECUTE) {
        console.log(
            "\nDry-run selesai. Jalankan `npm run vacate:deleted-bms:execute` untuk menonaktifkan assignment di atas.",
        );
        return;
    }

    const { count } = await prisma.bmsStoreAssignment.updateMany({
        where: { id: { in: assignments.map((a) => a.id) }, isActive: true },
        data: {
            isActive: false,
            unassignedAt: new Date(),
            unassignedByNIK: null,
            notes: CLEANUP_NOTE,
        },
    });

    console.log(`\n🎉 ${count} assignment dinonaktifkan. Toko-toko tersebut sekarang vacant.`);
}

run()
    .catch((err) => {
        console.error("❌ Terjadi kesalahan saat menjalankan script:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
```

- [ ] **Step 2: Register npm scripts**

In `package.json`, right after the line `"export:unassigned-stores": "tsx scripts/export-unassigned-stores.ts",`, add:

```json
    "vacate:deleted-bms": "tsx scripts/vacate-deleted-bms-assignments.ts",
    "vacate:deleted-bms:execute": "tsx scripts/vacate-deleted-bms-assignments.ts --execute",
```

- [ ] **Step 3: Run the dry-run**

Run: `npm run vacate:deleted-bms`
Expected: the first line is `🔍 MODE DRY-RUN: tidak ada data yang diubah.`, followed by either `✅ Tidak ada assignment aktif ...` or a table and a `Total: ...` line ending with the dry-run hint. No data changes. **Do not run the `:execute` variant.**

- [ ] **Step 4: Update the task note and commit**

In the note, add to `## Changed Files`:

```markdown
- `scripts/vacate-deleted-bms-assignments.ts`, `package.json`: script dry-run/execute untuk assignment milik BMS yang sudah dihapus.
```

Under `## Verification`, record only the dry-run's aggregate counts (number of assignments and number of BMS). Do not record names or NIKs. Under `## Remaining Work and Risks`, add: `Eksekusi npm run vacate:deleted-bms:execute menunggu keputusan user setelah meninjau dry-run.`

```bash
git add scripts/vacate-deleted-bms-assignments.ts package.json docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "feat(scripts): add deleted bms assignment cleanup"
```

---

### Task 6: Canonical docs and final verification

**Files:**
- Modify: `CLAUDE.md` (Quick Start "Maintenance and cleanup" block and "Notes" list)
- Modify: `docs/agent-notes/<timestamp>-coverage-bms-unassigned-row.md`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing new.

- [ ] **Step 1: Update CLAUDE.md**

In the "Maintenance and cleanup" code block, after the line `npm run cleanup-photos-v2:execute # Execute: archive approved PJUM photos`, add:

```bash
npm run vacate:deleted-bms        # Dry-run: list active store assignments of deleted BMS users
npm run vacate:deleted-bms:execute # Execute: deactivate those assignments (stores become vacant)
```

In the "Notes" list at the end, add:

```markdown
- Deleting a BMS user (`adminDeleteUser`, BMC `deleteUser`) deactivates all their active `BmsStoreAssignment` rows in the same transaction (`lib/bms-store-assignment.ts`); the stores become vacant and appear under "Belum di-assign BMS" in the Coverage BMS table, whose branch totals count every active store (same population as the preventive summary card)
```

- [ ] **Step 2: Run all checks**

Run: `npx tsx app/dashboard/preventive/coverage-hierarchy.spec.ts`
Expected: `coverage-hierarchy assertions passed`

Run: `npx tsx lib/bms-store-assignment.spec.ts`
Expected: `bms-store-assignment assertions passed`

Run: `npx tsx app/dashboard/preventive/preventive-dashboard.spec.ts`
Expected: passes (regression check on the sibling spec).

Run: `npm run lint`
Expected: no new errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Finalize the task note and commit**

Set `## Remaining Work and Risks` in the note to:

```markdown
- Eksekusi `npm run vacate:deleted-bms:execute` menunggu keputusan user setelah meninjau dry-run.
- `BmsStoreAssignment` tetap tanpa unique constraint per toko; toko ber-assignment ganda tampil di beberapa BMS (total cabang sudah dihitung unik).
- 47 toko unassigned di CIANJUR (dan cabang lain) perlu di-assign oleh BMC; itu pekerjaan data, bukan kode.
```

Add the final check results under `## Verification`.

```bash
git add CLAUDE.md docs/agent-notes/*-coverage-bms-unassigned-row.md
git commit -m "docs: document bms delete vacating and coverage totals"
```
