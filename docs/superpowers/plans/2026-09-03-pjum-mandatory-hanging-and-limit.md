# PJUM Mandatory Hanging And Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force active laporan gantung into the next PJUM, block PJUM creation when the selected total exceeds Rp1,000,000, and show BNM exactly which hanging reports are involved before approval.

**Architecture:** Keep `Report.pjumHangingAt`, `Report.pjumExpiredAt`, and `Report.pjumExportedAt` as the source of truth for laporan gantung. Add a shared pure policy helper so both BMC PJUM creation routes enforce the same mandatory hanging and Rp1,000,000 selection cap rules. Extend BNM detail payloads to include included and omitted hanging report summaries, then render the lists in both approval views.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, shadcn/ui, lucide-react, Node/tsx focused tests.

## Global Constraints

- Laporan gantung is not any old valid report; it is a completed, PJUM-required report omitted when its source-period PJUM was approved by BNM.
- Active laporan gantung has `pjumHangingAt != null`, `pjumExpiredAt == null`, `pjumExportedAt == null`, and belongs to the active or locked BMS balance period.
- Active laporan gantung must be auto-selected for PJUM creation and must not be removable by BMC.
- New valid reports in the new PJUM period remain selectable and unselectable.
- Total nominal selected for a PJUM, including mandatory hanging reports, must not exceed Rp1,000,000.
- If mandatory hanging reports alone exceed Rp1,000,000, PJUM creation remains blocked; BMC must see why.
- BNM review must show which reports are hanging before clicking approval.
- Follow `AI_RULES.md`: use existing shadcn/ui components first, keep custom UI reusable, and put spacing on wrappers rather than inside shadcn components.
- Permanent behavior changes require canonical docs and a dated task note before finishing.

---

## File Structure

- `lib/pjum-selection-policy.ts`: new pure policy helper for selected total, mandatory hanging numbers, missing mandatory reports, and limit validation.
- `lib/pjum-selection-policy.spec.ts`: pure tests for mandatory hanging selection and Rp1,000,000 cap.
- `app/dashboard/pjum/actions.ts`: dashboard BMC server validation for mandatory hanging inclusion and total cap.
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: dashboard BMC UI selection behavior, disabled create button, and explanatory copy.
- `app/reports/pjum/actions.ts`: legacy/full-page BMC server validation and matching cap behavior.
- `app/reports/pjum/_components/pjum-view.tsx`: legacy/full-page BMC UI copy and disabled export behavior.
- `lib/balance.ts`: extend omitted hanging summary shape with `finishedAt`; add helper for included hanging reports used by approval detail queries.
- `app/reports/pjum/approval-actions.ts`: expose included hanging reports in BNM review detail.
- `app/reports/pjum/_components/pjum-approval-detail.tsx`: show included and omitted hanging report lists before approval.
- `app/dashboard/pjum/[id]/page.tsx`: expose included hanging reports for dashboard BNM review.
- `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx`: pass omitted report numbers into the existing expiry confirmation copy.
- `docs/project/04-workflows.md`: update PJUM workflow rules.
- `docs/project/10-bms-weekly-balance.md`: update balance/PJUM cap behavior.
- `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-mandatory-hanging-limit.md`: implementation note in Asia/Jakarta time, created before the first commit so the local pre-commit hook can pass.

---

### Task 1: Shared PJUM Selection Policy

**Files:**
- Create: `lib/pjum-selection-policy.ts`
- Create: `lib/pjum-selection-policy.spec.ts`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-mandatory-hanging-limit.md`

**Interfaces:**
- Produces: `PJUM_SELECTION_LIMIT = 1_000_000`
- Produces: `type PjumSelectionPolicyReport = { reportNumber: string; totalRealisasi: number; isHangingReport: boolean; isValid: boolean }`
- Produces: `evaluatePjumSelectionPolicy(input: { rows: PjumSelectionPolicyReport[]; selectedReportNumbers: string[]; limit?: number }): { mandatoryHangingReportNumbers: string[]; missingMandatoryHangingReportNumbers: string[]; selectedTotal: number; selectedCount: number; exceedsLimit: boolean; limit: number }`

- [ ] **Step 0: Create the required task note before the first commit**

Use `docs/agent-notes/TEMPLATE.md` and create a file named with Jakarta time:

```text
docs/agent-notes/YYYY-MM-DD-HHMM-pjum-mandatory-hanging-limit.md
```

The note must mention:

```md
## Scope

Mandatory active laporan gantung selection for BMC PJUM creation, Rp1,000,000
PJUM selected-total cap, and BNM review visibility for hanging reports.

## Decisions

- Laporan gantung remains defined by lifecycle fields, not by old completion date alone.
- Active hanging reports are mandatory but do not bypass the Rp1,000,000 PJUM total cap.
- Server actions enforce the same rules as the UI.
```

- [ ] **Step 1: Write failing tests for mandatory hanging and total cap**

```ts
import assert from "node:assert/strict";
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "./pjum-selection-policy";

const rows = [
    {
        reportNumber: "GANTUNG-1",
        totalRealisasi: 450_000,
        isHangingReport: true,
        isValid: true,
    },
    {
        reportNumber: "BARU-1",
        totalRealisasi: 400_000,
        isHangingReport: false,
        isValid: true,
    },
    {
        reportNumber: "BARU-2",
        totalRealisasi: 250_000,
        isHangingReport: false,
        isValid: true,
    },
    {
        reportNumber: "TIDAK-VALID",
        totalRealisasi: 100_000,
        isHangingReport: false,
        isValid: false,
    },
];

const ok = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["GANTUNG-1", "BARU-1"],
});
assert.deepEqual(ok.mandatoryHangingReportNumbers, ["GANTUNG-1"]);
assert.deepEqual(ok.missingMandatoryHangingReportNumbers, []);
assert.equal(ok.selectedTotal, 850_000);
assert.equal(ok.exceedsLimit, false);
assert.equal(ok.limit, PJUM_SELECTION_LIMIT);

const missing = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["BARU-1"],
});
assert.deepEqual(missing.missingMandatoryHangingReportNumbers, ["GANTUNG-1"]);

const over = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["GANTUNG-1", "BARU-1", "BARU-2"],
});
assert.equal(over.selectedTotal, 1_100_000);
assert.equal(over.exceedsLimit, true);

const hangingAloneOver = evaluatePjumSelectionPolicy({
    rows: [
        {
            reportNumber: "GANTUNG-BESAR",
            totalRealisasi: 1_100_000,
            isHangingReport: true,
            isValid: true,
        },
    ],
    selectedReportNumbers: ["GANTUNG-BESAR"],
});
assert.equal(hangingAloneOver.exceedsLimit, true);

console.log("PJUM selection policy assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: FAIL with module-not-found or missing export for `./pjum-selection-policy`.

- [ ] **Step 3: Implement the pure policy helper**

```ts
export const PJUM_SELECTION_LIMIT = 1_000_000;

export type PjumSelectionPolicyReport = {
    reportNumber: string;
    totalRealisasi: number;
    isHangingReport: boolean;
    isValid: boolean;
};

export function evaluatePjumSelectionPolicy(input: {
    rows: PjumSelectionPolicyReport[];
    selectedReportNumbers: string[];
    limit?: number;
}) {
    const limit = input.limit ?? PJUM_SELECTION_LIMIT;
    const selected = new Set(input.selectedReportNumbers);
    const validRows = input.rows.filter((row) => row.isValid);
    const mandatoryHangingReportNumbers = validRows
        .filter((row) => row.isHangingReport)
        .map((row) => row.reportNumber);
    const missingMandatoryHangingReportNumbers =
        mandatoryHangingReportNumbers.filter(
            (reportNumber) => !selected.has(reportNumber),
        );
    const selectedTotal = validRows.reduce(
        (sum, row) =>
            selected.has(row.reportNumber) ? sum + row.totalRealisasi : sum,
        0,
    );

    return {
        mandatoryHangingReportNumbers,
        missingMandatoryHangingReportNumbers,
        selectedTotal,
        selectedCount: validRows.filter((row) =>
            selected.has(row.reportNumber),
        ).length,
        exceedsLimit: selectedTotal > limit,
        limit,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: PASS and prints `PJUM selection policy assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/pjum-selection-policy.ts lib/pjum-selection-policy.spec.ts docs/agent-notes
git commit -m "feat: add pjum selection policy"
```

### Task 2: Dashboard BMC Create PJUM Enforcement

**Files:**
- Modify: `app/dashboard/pjum/actions.ts`
- Modify: `app/dashboard/pjum/_components/create-pjum-dialog.tsx`

**Interfaces:**
- Consumes: `evaluatePjumSelectionPolicy` from Task 1.
- Produces: dashboard create action rejects missing active hanging reports and totals over Rp1,000,000.
- Produces: dashboard create dialog auto-selects active hanging rows, prevents unselecting them, and disables create when selected total is over limit.

- [ ] **Step 1: Add server-side policy evaluation in `createDashboardPjum`**

In `app/dashboard/pjum/actions.ts`, import:

```ts
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "@/lib/pjum-selection-policy";
```

After `selectedReports` is built, add:

```ts
const policyRows = reports.map((report) => ({
    reportNumber: report.reportNumber,
    totalRealisasi: resolveReportTotalRealisasi(
        report.totalReal,
        report.items,
    ),
    isHangingReport: Boolean(
        report.pjumHangingAt &&
            !report.pjumExpiredAt &&
            !report.pjumExportedAt,
    ),
    isValid:
        report.status === "COMPLETED" &&
        requiresPjum(report.totalReal, report.items) &&
        !report.pjumExportedAt &&
        !report.pjumExpiredAt,
}));
const selectionPolicy = evaluatePjumSelectionPolicy({
    rows: policyRows,
    selectedReportNumbers: safeNumbers,
});

if (selectionPolicy.missingMandatoryHangingReportNumbers.length > 0) {
    return {
        error: `Laporan gantung ${selectionPolicy.missingMandatoryHangingReportNumbers.join(", ")} wajib masuk PJUM periode ini`,
        pjumExportId: null,
    };
}

if (selectionPolicy.exceedsLimit) {
    return {
        error: `Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp ${PJUM_SELECTION_LIMIT.toLocaleString("id-ID")}`,
        pjumExportId: null,
    };
}
```

- [ ] **Step 2: Replace date-based hanging detection in `createDashboardPjum`**

Replace:

```ts
const hangingReportNumbers = selectedReports
    .filter((report) => report.finishedAt && report.finishedAt < fromDate)
    .map((report) => report.reportNumber);
```

With:

```ts
const hangingReportNumbers = selectedReports
    .filter(
        (report) =>
            report.pjumHangingAt &&
            !report.pjumExpiredAt &&
            !report.pjumExportedAt,
    )
    .map((report) => report.reportNumber);
```

- [ ] **Step 3: Add client-side policy evaluation in create dialog**

In `app/dashboard/pjum/_components/create-pjum-dialog.tsx`, import:

```ts
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "@/lib/pjum-selection-policy";
```

After `selectedTotal`, add:

```ts
const selectionPolicy = evaluatePjumSelectionPolicy({
    rows:
        result?.rows.map((row) => ({
            reportNumber: row.reportNumber,
            totalRealisasi: row.totalRealisasi,
            isHangingReport: Boolean(row.isHangingReport),
            isValid: row.isValid,
        })) ?? [],
    selectedReportNumbers: selectedReports,
});
const isOverSelectionLimit = selectionPolicy.exceedsLimit;
```

Update `canCreate` to include:

```ts
!isOverSelectionLimit
```

- [ ] **Step 4: Keep hanging reports selected after search**

The existing search path already selects all valid rows. Keep that behavior:

```ts
setSelectedReports(
    nextResult.rows
        .filter((row) => row.isValid)
        .map((row) => row.reportNumber),
);
```

This means active hanging rows start selected together with current valid rows.

- [ ] **Step 5: Block unselect on hanging rows with a toast**

Replace `toggleReport` with:

```ts
function toggleReport(row: DashboardPjumCandidateRow) {
    if (!row.isValid) return;

    if (row.isHangingReport && selectedSet.has(row.reportNumber)) {
        toast.info("Laporan gantung wajib masuk PJUM periode ini dan tidak bisa dilepas.");
        return;
    }

    setSelectedReports((current) =>
        current.includes(row.reportNumber)
            ? current.filter((item) => item !== row.reportNumber)
            : [...current, row.reportNumber],
    );
}
```

- [ ] **Step 6: Make select-all preserve mandatory hanging rows**

Replace the deselect branch in `toggleAllValid` with:

```ts
if (allValidSelected) {
    setSelectedReports(
        validRows
            .filter((row) => row.isHangingReport)
            .map((row) => row.reportNumber),
    );
    return;
}
```

- [ ] **Step 7: Disable hanging row checkbox visually and explain with copy**

For row checkbox, change disabled to:

```tsx
disabled={!row.isValid || Boolean(row.isHangingReport)}
```

Keep `checked={selectedSet.has(row.reportNumber)}` so mandatory rows remain checked.

- [ ] **Step 8: Add over-limit UX info beside summary**

In the result summary area, after the hanging alert, add:

```tsx
{isOverSelectionLimit ? (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
        <AlertTriangle className="size-3.5" />
        Total laporan yang akan di-PJUM-kan {formatCurrency(selectedTotal)}.
        Maksimal {formatCurrency(PJUM_SELECTION_LIMIT)}. Kurangi laporan baru
        yang bukan laporan gantung.
    </div>
) : null}
```

- [ ] **Step 9: Run focused checks**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: PASS.

Run: `npx tsc --noEmit --pretty false --incremental false`

Expected: PASS, or only existing unrelated failures documented with exact file and line.

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/pjum/actions.ts app/dashboard/pjum/_components/create-pjum-dialog.tsx lib/pjum-selection-policy.ts lib/pjum-selection-policy.spec.ts
git commit -m "feat: require hanging reports in pjum"
```

### Task 3: Full-Page BMC PJUM Route Parity

**Files:**
- Modify: `app/reports/pjum/actions.ts`
- Modify: `app/reports/pjum/_components/pjum-view.tsx`

**Interfaces:**
- Consumes: `evaluatePjumSelectionPolicy` from Task 1.
- Produces: full-page PJUM create route rejects totals over Rp1,000,000 and still includes all eligible reports, including mandatory hanging reports.

- [ ] **Step 1: Add server-side cap to `exportPjum`**

In `app/reports/pjum/actions.ts`, import:

```ts
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "@/lib/pjum-selection-policy";
```

After `eligibleReportNumbers` and `eligibleSet`, add:

```ts
const selectionPolicy = evaluatePjumSelectionPolicy({
    rows: rangeReports.map((report) => ({
        reportNumber: report.reportNumber,
        totalRealisasi: resolveReportTotalRealisasi(
            report.totalReal,
            report.items,
        ),
        isHangingReport: isActivePjumHangingReport(report),
        isValid:
            report.status === "COMPLETED" &&
            !report.pjumExportedAt &&
            !report.pjumExpiredAt &&
            requiresPjum(report.totalReal, report.items),
    })),
    selectedReportNumbers: safeNumbers,
});

if (selectionPolicy.missingMandatoryHangingReportNumbers.length > 0) {
    return {
        error: `Laporan gantung ${selectionPolicy.missingMandatoryHangingReportNumbers.join(", ")} wajib masuk PJUM periode ini`,
        pjumExportId: null,
        pjumFinalDriveUrl: null,
    };
}

if (selectionPolicy.exceedsLimit) {
    return {
        error: `Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp ${PJUM_SELECTION_LIMIT.toLocaleString("id-ID")}`,
        pjumExportId: null,
        pjumFinalDriveUrl: null,
    };
}
```

- [ ] **Step 2: Add client-side cap in `PjumView`**

In `app/reports/pjum/_components/pjum-view.tsx`, import:

```ts
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "@/lib/pjum-selection-policy";
```

After `totalEligible`, add:

```ts
const selectionPolicy = evaluatePjumSelectionPolicy({
    rows:
        reports?.map((report) => ({
            reportNumber: report.reportNumber,
            totalRealisasi: report.totalRealisasi,
            isHangingReport: report.isHangingReport,
            isValid:
                report.status === "COMPLETED" &&
                !report.pjumExportedAt &&
                report.requiresPjum,
        })) ?? [],
    selectedReportNumbers: eligibleReports.map((report) => report.reportNumber),
});
const isOverSelectionLimit = selectionPolicy.exceedsLimit;
```

Update `canExport` to include:

```ts
!isOverSelectionLimit
```

- [ ] **Step 3: Add over-limit action-panel copy**

Near the existing hanging warning, add:

```tsx
{isOverSelectionLimit && (
    <span className="flex items-center gap-1 text-red-600 text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Total PJUM {formatCurrency(totalEligible)} melebihi batas {formatCurrency(PJUM_SELECTION_LIMIT)}.
    </span>
)}
```

- [ ] **Step 4: Guard `handleExport` for disabled click paths**

At the top of `handleExport`, after `if (!canExport) return;`, add:

```ts
if (isOverSelectionLimit) {
    toast.error("Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp 1.000.000");
    return;
}
```

- [ ] **Step 5: Run focused checks**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: PASS.

Run: `npx tsc --noEmit --pretty false --incremental false`

Expected: PASS, or only existing unrelated failures documented with exact file and line.

- [ ] **Step 6: Commit**

```bash
git add app/reports/pjum/actions.ts app/reports/pjum/_components/pjum-view.tsx
git commit -m "fix: cap pjum creation total"
```

### Task 4: BNM Hanging Report Lists Before Approval

**Files:**
- Modify: `lib/balance.ts`
- Modify: `app/reports/pjum/approval-actions.ts`
- Modify: `app/reports/pjum/_components/pjum-approval-detail.tsx`
- Modify: `app/dashboard/pjum/[id]/page.tsx`
- Modify: `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx`

**Interfaces:**
- Produces: `getIncludedHangingReportsForPjum(input: { approvedReportNumbers: string[] }): Promise<BmsHangingReportSummary[]>`
- Extends: `PjumExportDetail` with `includedHangingReports: { reportNumber: string; storeName: string; storeCode: string | null; finishedAt: string | null; realizedAmount: number }[]`
- Extends: approval confirmation with omitted report numbers.

- [ ] **Step 1: Extend omitted summary data in `lib/balance.ts`**

Add `finishedAt: true` to `getOmittedHangingReportsForPjum` select and return:

```ts
finishedAt: report.finishedAt,
```

Also create:

```ts
export async function getIncludedHangingReportsForPjum(input: {
    approvedReportNumbers: string[];
}) {
    if (input.approvedReportNumbers.length === 0) return [];

    const reports = await prisma.report.findMany({
        where: {
            reportNumber: { in: input.approvedReportNumbers },
            pjumHangingAt: { not: null },
        },
        select: {
            reportNumber: true,
            storeName: true,
            storeCode: true,
            finishedAt: true,
            totalReal: true,
        },
        orderBy: { finishedAt: "asc" },
    });

    return reports.map((report) => ({
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        storeCode: report.storeCode,
        finishedAt: report.finishedAt,
        realizedAmount: report.totalReal
            ? new Prisma.Decimal(report.totalReal.toString()).toNumber()
            : 0,
    }));
}
```

- [ ] **Step 2: Expose included hanging reports in `approval-actions.ts`**

Import `getIncludedHangingReportsForPjum` and extend `PjumExportDetail`:

```ts
includedHangingReports: {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    finishedAt: string | null;
    realizedAmount: number;
}[];
```

In `getPjumExportDetail`, add:

```ts
const includedHangingReports = await getIncludedHangingReportsForPjum({
    approvedReportNumbers: pjumExport.reportNumbers,
});
```

And map into `data`:

```ts
includedHangingReports: includedHangingReports.map((report) => ({
    reportNumber: report.reportNumber,
    storeName: report.storeName,
    storeCode: report.storeCode,
    finishedAt: report.finishedAt ? report.finishedAt.toISOString() : null,
    realizedAmount: report.realizedAmount,
})),
```

- [ ] **Step 3: Render BNM included/omitted hanging lists in `PjumApprovalDetail`**

In `app/reports/pjum/_components/pjum-approval-detail.tsx`, add a pending-only section before the reports table:

```tsx
{isPending &&
detail.includedHangingReports.length + detail.omittedHangingReports.length > 0 ? (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Deteksi Laporan Gantung
            </CardTitle>
            <CardDescription>
                Periksa laporan gantung sebelum menyetujui PJUM.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
            {detail.includedHangingReports.length > 0 ? (
                <HangingReportList
                    title="Masuk PJUM ini"
                    reports={detail.includedHangingReports}
                />
            ) : null}
            {detail.omittedHangingReports.length > 0 ? (
                <HangingReportList
                    title="Tidak masuk dan akan kedaluwarsa jika disetujui"
                    reports={detail.omittedHangingReports}
                />
            ) : null}
        </CardContent>
    </Card>
) : null}
```

Add a local helper below the component:

```tsx
function HangingReportList({
    title,
    reports,
}: {
    title: string;
    reports: Array<{
        reportNumber: string;
        storeName?: string;
        storeCode?: string | null;
        finishedAt?: string | null;
        realizedAmount: number;
    }>;
}) {
    return (
        <div className="space-y-2">
            <p className="font-semibold text-foreground">{title}</p>
            <div className="divide-y rounded-md border bg-background">
                {reports.map((report) => (
                    <div
                        key={report.reportNumber}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                        <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold">
                                {report.reportNumber}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {report.storeCode ? `${report.storeCode} - ` : ""}
                                {report.storeName ?? "-"}
                            </p>
                        </div>
                        <span className="shrink-0 font-semibold">
                            Rp {fmtCurrency(report.realizedAmount)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Render included hanging list on dashboard detail**

In `app/dashboard/pjum/[id]/page.tsx`, import `getIncludedHangingReportsForPjum`.

In `getPjumDetail`, add:

```ts
const includedHangingReports =
    pjum.status === "PENDING_APPROVAL"
        ? await getIncludedHangingReportsForPjum({
              approvedReportNumbers: pjum.reportNumbers,
          })
        : [];
```

Return it as `includedHangingReports`. Render a section above `Laporan dalam PJUM` with the same meaning:

```tsx
{detail.pjum.status === "PENDING_APPROVAL" &&
detail.includedHangingReports.length + detail.omittedHangingReports.length > 0 ? (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60">
        <div className="border-b border-amber-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-amber-900">
                Deteksi Laporan Gantung
            </h2>
            <p className="text-xs text-amber-800">
                BNM dapat melihat laporan gantung sebelum menyetujui PJUM.
            </p>
        </div>
        <div className="space-y-3 p-4 text-xs">
            <HangingReportSummary
                title="Masuk PJUM ini"
                reports={detail.includedHangingReports}
            />
            <HangingReportSummary
                title="Tidak masuk dan akan kedaluwarsa jika disetujui"
                reports={detail.omittedHangingReports}
            />
        </div>
    </section>
) : null}
```

Add a local `HangingReportSummary` helper mirroring the compact dashboard style.

- [ ] **Step 5: Include omitted report numbers in confirmation dialog**

Extend `PjumApprovalButtonProps`:

```ts
expiringHangingReportNumbers: string[];
```

Pass it from `app/dashboard/pjum/[id]/page.tsx`:

```tsx
expiringHangingReportNumbers={detail.omittedHangingReports.map(
    (report) => report.reportNumber,
)}
```

In the dialog description, append:

```tsx
Laporan: {expiringHangingReportNumbers.join(", ")}.
```

- [ ] **Step 6: Run focused checks**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: PASS.

Run: `npx tsc --noEmit --pretty false --incremental false`

Expected: PASS, or only existing unrelated failures documented with exact file and line.

- [ ] **Step 7: Commit**

```bash
git add lib/balance.ts app/reports/pjum/approval-actions.ts app/reports/pjum/_components/pjum-approval-detail.tsx app/dashboard/pjum/[id]/page.tsx app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx
git commit -m "feat: show hanging reports in pjum review"
```

### Task 5: Documentation, Task Note, And Verification

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/10-bms-weekly-balance.md`
- Modify: `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-mandatory-hanging-limit.md`

**Interfaces:**
- Produces: canonical documentation for mandatory active hanging selection and Rp1,000,000 PJUM creation cap.
- Produces: dated task note using Asia/Jakarta time.

- [ ] **Step 1: Update workflow documentation**

In `docs/project/04-workflows.md`, under `PJUM`, add these bullets:

```md
- Saat BMC membuat PJUM, laporan menggantung aktif otomatis terpilih dan tidak
  dapat dilepas dari pilihan.
- Laporan valid baru pada periode berjalan tetap dapat dipilih atau dilepas.
- Total nominal laporan yang akan masuk PJUM tidak boleh lebih dari
  Rp 1.000.000, termasuk laporan menggantung. Jika total melebihi batas,
  tombol buat PJUM harus nonaktif dan server action tetap menolak request.
- BNM melihat daftar laporan menggantung yang masuk PJUM dan laporan
  menggantung yang akan kedaluwarsa sebelum menyetujui PJUM.
```

- [ ] **Step 2: Update balance documentation**

In `docs/project/10-bms-weekly-balance.md`, update `Case Bisnis` with:

```md
| BMC membuat PJUM dengan laporan menggantung aktif | Laporan menggantung wajib ikut dan tidak bisa dilepas. |
| Total laporan PJUM melebihi Rp 1.000.000 | PJUM tidak bisa dibuat walaupun ada laporan menggantung; BMC harus mengurangi laporan baru jika memungkinkan. |
```

- [ ] **Step 3: Update task note verification section**

Update the task note created in Task 1 with changed files and verification results. Keep the same file name:

```text
docs/agent-notes/YYYY-MM-DD-HHMM-pjum-mandatory-hanging-limit.md
```

- [ ] **Step 4: Run verification**

Run: `npx tsx lib/pjum-selection-policy.spec.ts`

Expected: PASS.

Run: `npx tsc --noEmit --pretty false --incremental false`

Expected: PASS.

Run: `npm run lint -- app/dashboard/pjum app/reports/pjum lib/pjum-selection-policy.ts lib/balance.ts`

Expected: PASS.

Run: `npm run check:agent-note`

Expected: PASS.

- [ ] **Step 5: Review final diff**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git diff -- app/dashboard/pjum app/reports/pjum lib docs/project docs/agent-notes`

Expected: diff only contains mandatory hanging selection, total cap, BNM review visibility, docs, and task note changes.

- [ ] **Step 6: Commit**

```bash
git add docs/project/04-workflows.md docs/project/10-bms-weekly-balance.md docs/agent-notes lib app/dashboard/pjum app/reports/pjum
git commit -m "docs: record pjum hanging selection rules"
```

---

## Self-Review

- Spec coverage: Task 2 covers auto-select and unselect prevention for dashboard BMC; Task 2 and Task 3 cover server-side mandatory hanging enforcement and Rp1,000,000 cap; Task 4 covers BNM detection and exact report visibility; Task 5 covers canonical docs and required task note.
- Placeholder scan: no deferred implementation markers remain.
- Type consistency: `PjumSelectionPolicyReport`, `evaluatePjumSelectionPolicy`, `includedHangingReports`, and `omittedHangingReports` shapes are repeated consistently across tasks.
- Scope check: this is one cohesive PJUM selection/review adjustment, not independent subsystems.
