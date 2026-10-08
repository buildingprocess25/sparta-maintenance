# BMS Branch-Wide Store Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable BMS users to view and select all stores within their branch on their dashboard and report creation forms, while preserving the legacy per-BMS assignment logic via a feature flag.

**Architecture:** Introduce a central configuration flag `BMS_STORE_COVERAGE_MODE` in `lib/bms-coverage-config.ts`. Update `getBmsPreventiveCoverage`, `getAssignedStoresForBms`, and the report submit coverage guard to dynamically evaluate this mode. When set to `"BRANCH_WIDE"`, all active stores in the BMS user's branch are accessible; when set to `"ASSIGNED_ONLY"`, original `BmsStoreAssignment` filtering is applied.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM, PostgreSQL.

## Global Constraints

- Mode switch must be instant and toggleable via `BMS_STORE_COVERAGE_MODE` without deleting or breaking existing legacy logic.
- Scope changes strictly to BMS user workflows (BMS Dashboard, BMS Coverage Page, Report Creation / Submission). BMC and Admin views remain untouched.
- TypeScript types must remain strict with zero build or runtime regression.

---

### Task 1: Create Central Feature Flag Configuration

**Files:**
- Create: `lib/bms-coverage-config.ts`

**Interfaces:**
- Produces: `BMS_STORE_COVERAGE_MODE` ("BRANCH_WIDE" | "ASSIGNED_ONLY"), `isBranchWideBmsCoverage()` helper function.

- [ ] **Step 1: Write `lib/bms-coverage-config.ts`**

```typescript
export type BmsCoverageMode = "BRANCH_WIDE" | "ASSIGNED_ONLY";

/**
 * Feature flag for BMS Store Coverage:
 * - "BRANCH_WIDE" (Default): BMS can view and submit reports for ALL active stores in their branch.
 * - "ASSIGNED_ONLY" (Legacy): BMS can only view/submit reports for stores explicitly assigned to their NIK (or unassigned stores in branch).
 */
export const BMS_STORE_COVERAGE_MODE: BmsCoverageMode = "BRANCH_WIDE";

export function isBranchWideBmsCoverage(): boolean {
    return BMS_STORE_COVERAGE_MODE === "BRANCH_WIDE";
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add lib/bms-coverage-config.ts
git commit -m "feat(bms): add central feature flag for branch-wide bms coverage mode"
```

---

### Task 2: Update BMS Preventive Coverage Query

**Files:**
- Modify: `app/dashboard/preventive/actions.ts:595-676`

**Interfaces:**
- Consumes: `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`
- Produces: `getBmsPreventiveCoverage(user)` returning all branch stores when `"BRANCH_WIDE"` is active.

- [ ] **Step 1: Import feature flag and update `getBmsPreventiveCoverage`**

In `app/dashboard/preventive/actions.ts`:
Import `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`.

Update query logic in `getBmsPreventiveCoverage`:
```typescript
import { isBranchWideBmsCoverage } from "@/lib/bms-coverage-config";

// ... inside getBmsPreventiveCoverage ...
    const branchWideMode = isBranchWideBmsCoverage();

    const rawRows = branchWideMode
        ? await prisma.$queryRaw<any[]>`
            WITH QuarterReports AS (
                SELECT 
                    r."storeCode",
                    r."reportNumber",
                    r."createdAt"
                FROM "Report" r
                WHERE ${Prisma.join(reportPredicates, " AND ")}
            ),
            RankedReports AS (
                SELECT 
                    "storeCode",
                    "reportNumber",
                    "createdAt",
                    ROW_NUMBER() OVER(PARTITION BY "storeCode" ORDER BY "createdAt" DESC) as rn
                FROM QuarterReports
            )
            SELECT 
                s.code as "storeCode",
                s.name as "storeName",
                s.brand,
                rr."reportNumber",
                rr."createdAt" as "doneAt"
            FROM "Store" s
            LEFT JOIN RankedReports rr ON s.code = rr."storeCode" AND rr.rn = 1
            WHERE s."isActive" = true
              AND s."branchName" IN (${Prisma.join(user.branchNames)})
            ORDER BY s.code ASC;
        `
        : await prisma.$queryRaw<any[]>`
            WITH QuarterReports AS (
                SELECT 
                    r."storeCode",
                    r."reportNumber",
                    r."createdAt"
                FROM "Report" r
                WHERE ${Prisma.join(reportPredicates, " AND ")}
            ),
            RankedReports AS (
                SELECT 
                    "storeCode",
                    "reportNumber",
                    "createdAt",
                    ROW_NUMBER() OVER(PARTITION BY "storeCode" ORDER BY "createdAt" DESC) as rn
                FROM QuarterReports
            )
            SELECT 
                s.code as "storeCode",
                s.name as "storeName",
                s.brand,
                rr."reportNumber",
                rr."createdAt" as "doneAt"
            FROM "Store" s
            JOIN "BmsStoreAssignment" bsa ON s.code = bsa."storeCode" AND bsa."bmsNIK" = ${user.NIK} AND bsa."isActive" = true
            LEFT JOIN RankedReports rr ON s.code = rr."storeCode" AND rr.rn = 1
            WHERE s."isActive" = true
            ORDER BY s.code ASC;
        `;
```

- [ ] **Step 2: Commit Task 2**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "feat(bms): support branch-wide store coverage in getBmsPreventiveCoverage"
```

---

### Task 3: Update BMS Store Query for Report Creation / Edit

**Files:**
- Modify: `app/reports/actions/queries.ts:66-100`

**Interfaces:**
- Consumes: `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`
- Produces: `getAssignedStoresForBms(bmsNIK)` returning all stores in user's branch when `"BRANCH_WIDE"` mode is enabled.

- [ ] **Step 1: Import feature flag and update `getAssignedStoresForBms`**

In `app/reports/actions/queries.ts`:
Import `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`.

Update `getAssignedStoresForBms`:
```typescript
import { isBranchWideBmsCoverage } from "@/lib/bms-coverage-config";

export async function getAssignedStoresForBms(bmsNIK: string) {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && user.NIK !== bmsNIK) {
        throw new Error("Anda hanya dapat mengakses toko coverage Anda sendiri");
    }

    const branchWideMode = isBranchWideBmsCoverage();

    const storeWhere: Prisma.StoreWhereInput = branchWideMode
        ? {
              isActive: true,
              branchName: { in: user.branchNames },
          }
        : {
              isActive: true,
              OR: [
                  // 1. Toko yang secara spesifik di-assign aktif ke BMS ini
                  {
                      storeAssignments: {
                          some: {
                              bmsNIK,
                              isActive: true,
                          },
                      },
                  },
                  // 2. Fallback: Toko di cabang BMS ini yang BELUM memiliki BMS penanggung jawab aktif (unassigned / vacant)
                  {
                      branchName: { in: user.branchNames },
                      storeAssignments: {
                          none: {
                              isActive: true,
                          },
                      },
                  },
              ],
          };

    const stores = await prisma.store.findMany({
        where: storeWhere,
        orderBy: { name: "asc" },
        select: {
            code: true,
            name: true,
            brand: true,
        },
    });

    const year = getJakartaYear();
    const quarter = getJakartaCurrentQuarter();
    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);

    // Fetch all non-DRAFT reports for this BMS user's branch in the current quarter
    const reportsThisQuarter = await prisma.report.findMany({
        where: {
            store: {
                branchName: { in: user.branchNames },
            },
            status: { not: "DRAFT" },
            createdAt: { gte: start, lt: endExclusive },
        },
        select: { storeCode: true, status: true, items: true },
    });

    const storesWithPreventive = new Set<string>();
    for (const report of reportsThisQuarter) {
        if (report.storeCode && isRecordedPreventiveReport(report)) {
            storesWithPreventive.add(report.storeCode);
        }
    }

    return stores.map((store) => ({
        ...store,
        hasPreventiveChecklist: storesWithPreventive.has(store.code),
    }));
}
```

- [ ] **Step 2: Commit Task 3**

```bash
git add app/reports/actions/queries.ts
git commit -m "feat(bms): support branch-wide store options in getAssignedStoresForBms"
```

---

### Task 4: Update Report Submit Coverage Guard

**Files:**
- Modify: `app/reports/actions/submit.ts:61-100`

**Interfaces:**
- Consumes: `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`
- Produces: `submitReport` allowing any store in user's branch when `"BRANCH_WIDE"` mode is enabled.

- [ ] **Step 1: Import feature flag and update coverage guard in `submitReport`**

In `app/reports/actions/submit.ts`:
Import `isBranchWideBmsCoverage` from `@/lib/bms-coverage-config`.

Update Coverage Guard:
```typescript
import { isBranchWideBmsCoverage } from "@/lib/bms-coverage-config";

// ... inside submitReport ...
    // ── Coverage Guard: BMS hanya boleh membuat laporan untuk toko di cabangnya / coveragenya ──
    if (data.storeCode) {
        const store = await prisma.store.findUnique({
            where: { code: data.storeCode },
            select: { branchName: true },
        });

        if (!store || !user.branchNames.includes(store.branchName)) {
            return {
                error: "Toko di luar cabang Anda",
                detail: `Toko ${data.storeCode} berada di luar cabang operasional Anda.`,
            };
        }

        const branchWideMode = isBranchWideBmsCoverage();
        if (!branchWideMode) {
            const isAssignedToThisBms = await prisma.bmsStoreAssignment.findFirst({
                where: {
                    bmsNIK: user.NIK,
                    storeCode: data.storeCode,
                    isActive: true,
                },
            });

            if (!isAssignedToThisBms) {
                // Cek apakah toko ini memiliki assignment aktif ke BMS lain
                const assignedToOtherBms = await prisma.bmsStoreAssignment.findFirst({
                    where: {
                        storeCode: data.storeCode,
                        isActive: true,
                    },
                    include: {
                        bms: { select: { name: true, NIK: true } },
                    },
                });

                if (assignedToOtherBms) {
                    return {
                        error: "Toko di luar wilayah coverage Anda",
                        detail: `Toko ${data.storeCode} merupakan coverage milik BMS ${assignedToOtherBms.bms.name} (${assignedToOtherBms.bmsNIK}). Anda tidak dapat membuat laporan untuk toko ini.`,
                    };
                }
            }
        }
    }
```

- [ ] **Step 2: Commit Task 4**

```bash
git add app/reports/actions/submit.ts
git commit -m "feat(bms): update submit report coverage guard for branch-wide mode"
```

---

### Task 5: Verification & Task Note

**Files:**
- Create: `docs/agent-notes/2026-10-08-1505-bms-branch-wide-stores.md`

- [ ] **Step 1: Run typecheck / build verification**

Run `npx tsc --noEmit` or build check to ensure zero TypeScript or build errors.

- [ ] **Step 2: Create task note**

Create `docs/agent-notes/2026-10-08-1505-bms-branch-wide-stores.md` using Asia/Jakarta timestamp following `AGENTS.md` guidelines.

- [ ] **Step 3: Commit Task 5**

```bash
git add docs/agent-notes/2026-10-08-1505-bms-branch-wide-stores.md
git commit -m "docs: add task note for bms branch wide store coverage feature flag"
```
