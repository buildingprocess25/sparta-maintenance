# Report Archive and Preventive Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Admin-only archive action that removes a garbage report from operational workflows without losing complete Preventive evidence, while retaining a separately confirmed permanent database delete.

**Architecture:** Keep `Report` as the single evidence record and add one terminal archive status. Derive complete Preventive evidence from the existing checklist catalog through one pure TypeScript helper and one matching Prisma SQL predicate. Keep archive/delete mutations transactional, reuse the existing report detail Danger Zone, and explicitly exclude archived records at shared operational query boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Prisma 7/PostgreSQL, existing shadcn UI, Node `assert`, `tsx`, ESLint.

## Global Constraints

- Only `ADMIN` may archive or permanently delete on the server.
- Archive and permanent delete remain separate actions.
- Archive requires complete Preventive evidence and never asks for a reason.
- Permanent delete requires the exact report number and deletes database records only; Google Drive files remain untouched.
- Any related `APPROVED` PJUM blocks archive and delete. `PENDING_APPROVAL` and `REJECTED` PJUM records detach the report and are deleted when empty.
- `ARCHIVED_PREVENTIVE` is read-only, absent from operational lists, workflows, KPIs, activity feeds, PJUM candidates, and operational XLSX sheets.
- Archived reports remain in Preventive dashboard/history/XLSX and remain linkable to the branch-scoped dashboard detail for `ADMIN`, `BMC`, and `BNM_MANAGER`.
- `BMS` cannot list or directly open an archived report.
- The report `createdAt` remains the Preventive completion date.
- Quarter boundaries use the existing `Asia/Jakarta` time helpers everywhere.
- Preserve the current HEAD OFFICE mutation restriction.
- Add no archive table, restore flow, archive list, dependency, backfill, Drive cleanup, or manual production migration.
- Implement one task at a time. After each task: run its focused checks, review the diff, commit, and wait for explicit `lanjut`.

---

## Source Spec

- `docs/superpowers/specs/2026-07-23-report-archive-preventive-design.md`

## File Structure

Create:

- `lib/report-preventive.ts` — canonical Preventive item IDs and pure completeness checks.
- `lib/report-preventive-sql.ts` — matching reusable Prisma SQL predicate.
- `lib/report-preventive.spec.ts` — executable evidence-rule assertions.
- `lib/report-retention.ts` — pure delete-confirmation and PJUM-detachment decisions.
- `lib/report-retention.spec.ts` — executable destructive-action policy assertions.
- `prisma/migrations/20260723090000_add_report_archive_status/migration.sql` — additive enum migration only.

Modify:

- `prisma/schema.prisma`
- `lib/report-status.ts`
- `app/dashboard/reports/actions.ts`
- `app/dashboard/preventive/actions.ts`
- `app/admin/export/queries.ts`
- `app/reports/actions/queries.ts`
- `app/dashboard/queries.ts`
- `app/dashboard/branches/actions.ts`
- `app/dashboard/pjum/actions.ts`
- `app/dashboard/intervensi/revisi-laporan/data.ts`
- `app/reports/[reportNumber]/page.tsx`
- `app/dashboard/reports/[reportNumber]/page.tsx`
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`
- `app/dashboard/reports/[reportNumber]/_components/actions-tab.tsx`
- `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`

Verify without changing unless a failing check proves necessary:

- `app/dashboard/preventive/_components/admin-preventive-table.tsx` — existing links already target dashboard report detail.
- Materials/realisasi/PJUM queries already restricted to explicit operational statuses such as `COMPLETED`.
- Existing approval/edit/completion mutations already require exact workflow statuses.

---

### Task 1: Establish One Complete-Preventive Rule

**Files:**

- Create: `lib/report-preventive.spec.ts`
- Create: `lib/report-preventive.ts`
- Create: `lib/report-preventive-sql.ts`

**Interfaces:**

```ts
export const PREVENTIVE_ITEM_IDS: readonly string[];

export function hasCompletePreventiveEvidence(items: unknown): boolean;

export function isRecordedPreventiveReport(input: {
    status: string;
    items: unknown;
}): boolean;

export function completePreventiveEvidenceSql(input: {
    statusColumn: Prisma.Sql;
    itemsColumn: Prisma.Sql;
}): Prisma.Sql;
```

- [ ] **Step 1: Write the failing pure evidence check**

Create `lib/report-preventive.spec.ts` with complete canonical items derived from `PREVENTIVE_ITEM_IDS`, then assert:

```ts
import assert from "node:assert/strict";
import {
    PREVENTIVE_ITEM_IDS,
    hasCompletePreventiveEvidence,
    isRecordedPreventiveReport,
} from "./report-preventive";

const completeItems = PREVENTIVE_ITEM_IDS.map((itemId, index) => ({
    itemId,
    preventiveCondition:
        index % 3 === 0 ? "OK" : index % 3 === 1 ? "NOT_OK" : "TIDAK_ADA",
}));

assert.equal(hasCompletePreventiveEvidence(completeItems), true);
assert.equal(hasCompletePreventiveEvidence(completeItems.slice(1)), false);
assert.equal(
    hasCompletePreventiveEvidence([
        ...completeItems.slice(0, -1),
        {
            itemId: PREVENTIVE_ITEM_IDS.at(-1),
            preventiveCondition: null,
        },
        { itemId: "I999", preventiveCondition: "OK" },
    ]),
    false,
);
assert.equal(
    isRecordedPreventiveReport({ status: "DRAFT", items: completeItems }),
    false,
);
assert.equal(
    isRecordedPreventiveReport({
        status: "PENDING_ESTIMATION",
        items: completeItems,
    }),
    true,
);
assert.equal(
    isRecordedPreventiveReport({
        status: "ARCHIVED_PREVENTIVE",
        items: completeItems,
    }),
    true,
);

console.log("report preventive assertions passed");
```

- [ ] **Step 2: Run the check and confirm RED**

Run:

```bash
npx tsx lib/report-preventive.spec.ts
```

Expected: FAIL because `lib/report-preventive.ts` does not exist.

- [ ] **Step 3: Implement the smallest pure helper**

Create `lib/report-preventive.ts`:

```ts
import { checklistCategories } from "@/lib/checklist-data";

const VALID_PREVENTIVE_CONDITIONS = new Set([
    "OK",
    "NOT_OK",
    "TIDAK_ADA",
]);

export const PREVENTIVE_ITEM_IDS = checklistCategories
    .filter((category) => category.isPreventive)
    .flatMap((category) => category.items.map((item) => item.id));

export function hasCompletePreventiveEvidence(items: unknown): boolean {
    if (!Array.isArray(items)) return false;

    return PREVENTIVE_ITEM_IDS.every((requiredId) =>
        items.some(
            (item) =>
                typeof item === "object" &&
                item !== null &&
                "itemId" in item &&
                "preventiveCondition" in item &&
                item.itemId === requiredId &&
                VALID_PREVENTIVE_CONDITIONS.has(
                    String(item.preventiveCondition),
                ),
        ),
    );
}

export function isRecordedPreventiveReport(input: {
    status: string;
    items: unknown;
}): boolean {
    return (
        input.status !== "DRAFT" &&
        hasCompletePreventiveEvidence(input.items)
    );
}
```

- [ ] **Step 4: Add the matching SQL predicate**

Create `lib/report-preventive-sql.ts`:

```ts
import "server-only";

import { Prisma } from "@prisma/client";
import { PREVENTIVE_ITEM_IDS } from "@/lib/report-preventive";

export function completePreventiveEvidenceSql(input: {
    statusColumn: Prisma.Sql;
    itemsColumn: Prisma.Sql;
}): Prisma.Sql {
    return Prisma.sql`
        ${input.statusColumn} <> 'DRAFT'::"ReportStatus"
        AND (
            SELECT COUNT(DISTINCT item->>'itemId')
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(${input.itemsColumn}) = 'array'
                    THEN ${input.itemsColumn}
                    ELSE '[]'::jsonb
                END
            ) AS item
            WHERE item->>'itemId' IN (${Prisma.join(PREVENTIVE_ITEM_IDS)})
              AND item->>'preventiveCondition' IN ('OK', 'NOT_OK', 'TIDAK_ADA')
        ) = ${PREVENTIVE_ITEM_IDS.length}
    `;
}
```

- [ ] **Step 5: Run GREEN and focused static checks**

Run:

```bash
npx tsx lib/report-preventive.spec.ts
npx eslint lib/report-preventive.ts lib/report-preventive-sql.ts lib/report-preventive.spec.ts
npx tsc --noEmit
git diff --check
```

Expected: assertions print `report preventive assertions passed`; all remaining commands exit 0.

- [ ] **Step 6: Review and commit Task 1**

Check that required IDs only come from `checklistCategories`, invalid/missing conditions fail, and SQL uses `COUNT(DISTINCT ...)`.

```bash
git add lib/report-preventive.ts lib/report-preventive-sql.ts lib/report-preventive.spec.ts
git commit -m "feat: centralize preventive evidence"
```

Stop and wait for `lanjut`.

---

### Task 2: Add the Archive Enums and Display Labels

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260723090000_add_report_archive_status/migration.sql`
- Modify: `lib/report-status.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`

- [ ] **Step 1: Add the schema enum values**

Append:

```prisma
enum ReportStatus {
  DRAFT
  PENDING_ESTIMATION
  ESTIMATION_APPROVED
  ESTIMATION_REJECTED_REVISION
  ESTIMATION_REJECTED
  IN_PROGRESS
  PENDING_REVIEW
  APPROVED_BMC
  REVIEW_REJECTED_REVISION
  COMPLETED
  ARCHIVED_PREVENTIVE
}

enum ActivityAction {
  SUBMITTED
  RESUBMITTED_ESTIMATION
  RESUBMITTED_WORK
  WORK_STARTED
  COMPLETION_SUBMITTED
  ESTIMATION_APPROVED
  ESTIMATION_REJECTED_REVISION
  ESTIMATION_REJECTED
  WORK_APPROVED
  WORK_REJECTED_REVISION
  FINAL_APPROVED_BNM
  FINAL_REJECTED_REVISION_BNM
  ADMIN_REALISASI_REVISED
  ADMIN_ARCHIVED_PREVENTIVE
}
```

- [ ] **Step 2: Add an additive migration only**

Create `prisma/migrations/20260723090000_add_report_archive_status/migration.sql`:

```sql
ALTER TYPE "public"."ReportStatus"
ADD VALUE IF NOT EXISTS 'ARCHIVED_PREVENTIVE';

ALTER TYPE "public"."ActivityAction"
ADD VALUE IF NOT EXISTS 'ADMIN_ARCHIVED_PREVENTIVE';
```

Do not add `UPDATE`, `DELETE`, or backfill SQL.

- [ ] **Step 3: Add detail-only labels without exposing an operational filter**

In `lib/report-status.ts`, do not add archive to `REPORT_STATUS_ORDER`, `REPORT_STATUS_OPTIONS`, or `REPORT_STATUS_SLUGS`. Special-case:

```ts
export const ARCHIVED_PREVENTIVE_STATUS = "ARCHIVED_PREVENTIVE" as const;
export const OPERATIONAL_EXCLUDED_REPORT_STATUSES = [
    "DRAFT",
    ARCHIVED_PREVENTIVE_STATUS,
] as const;

export function getReportStatusLabel(status: string): string {
    if (status === ARCHIVED_PREVENTIVE_STATUS) return "Archived Preventive";
    return isReportStatusKey(status) ? REPORT_STATUS_LABELS[status] : status;
}

export function getReportStatusBadgeClass(status: string): string {
    if (status === ARCHIVED_PREVENTIVE_STATUS) {
        return "bg-slate-200 text-slate-800 hover:bg-slate-200/80";
    }
    return isReportStatusKey(status)
        ? REPORT_STATUS_BADGE_CLASS[status]
        : "bg-slate-100 text-slate-700 hover:bg-slate-100/80";
}
```

Also ensure `isActiveReportStatus("ARCHIVED_PREVENTIVE")` remains false.

In `report-detail-utils.ts`, map:

```ts
ADMIN_ARCHIVED_PREVENTIVE: "Admin mengarsipkan laporan sebagai Preventive",
```

- [ ] **Step 4: Generate the local Prisma client and validate**

Run:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx eslint lib/report-status.ts app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts
npx tsc --noEmit
git diff --check
```

Expected: Prisma schema valid/generated; all checks exit 0. Do not run `prisma migrate deploy`, `prisma migrate dev`, or any production command.

- [ ] **Step 5: Review and commit Task 2**

```bash
git add prisma/schema.prisma prisma/migrations/20260723090000_add_report_archive_status/migration.sql lib/report-status.ts app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts
git commit -m "feat: add report archive enums"
```

Stop and wait for `lanjut`.

---

### Task 3: Implement Safe Admin Archive and Permanent Delete

**Files:**

- Create: `lib/report-retention.spec.ts`
- Create: `lib/report-retention.ts`
- Modify: `app/dashboard/reports/actions.ts`

**Interfaces:**

```ts
export function isDeleteConfirmationValid(
    reportNumber: string,
    confirmation: string,
): boolean;

export function resolvePjumDetachments(
    reportNumber: string,
    pjums: Array<{
        id: string;
        status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
        reportNumbers: string[];
    }>,
):
    | { ok: false; error: string }
    | {
          ok: true;
          deleteIds: string[];
          updates: Array<{ id: string; reportNumbers: string[] }>;
      };

export async function archiveAdminReport(
    reportNumber: string,
): Promise<{ success?: true; error?: string }>;

export async function deleteAdminReport(
    reportNumber: string,
    confirmationReportNumber: string,
): Promise<{ success?: true; error?: string }>;
```

- [ ] **Step 1: Write the failing destructive-action policy check**

Create `lib/report-retention.spec.ts` covering:

```ts
import assert from "node:assert/strict";
import {
    isDeleteConfirmationValid,
    resolvePjumDetachments,
} from "./report-retention";

assert.equal(isDeleteConfirmationValid("RPT-001", "RPT-001"), true);
assert.equal(isDeleteConfirmationValid("RPT-001", "RPT-002"), false);

assert.deepEqual(
    resolvePjumDetachments("RPT-001", [
        {
            id: "approved",
            status: "APPROVED",
            reportNumbers: ["RPT-001"],
        },
    ]),
    {
        ok: false,
        error: "Laporan terikat PJUM yang sudah disetujui",
    },
);

assert.deepEqual(
    resolvePjumDetachments("RPT-001", [
        {
            id: "empty-after-detach",
            status: "PENDING_APPROVAL",
            reportNumbers: ["RPT-001"],
        },
        {
            id: "retained",
            status: "REJECTED",
            reportNumbers: ["RPT-001", "RPT-002"],
        },
    ]),
    {
        ok: true,
        deleteIds: ["empty-after-detach"],
        updates: [{ id: "retained", reportNumbers: ["RPT-002"] }],
    },
);

console.log("report retention assertions passed");
```

- [ ] **Step 2: Run the check and confirm RED**

```bash
npx tsx lib/report-retention.spec.ts
```

Expected: FAIL because `lib/report-retention.ts` does not exist.

- [ ] **Step 3: Implement the pure policy helper**

Implement only exact string confirmation and the approved/detach/delete decisions. Do not add a repository class or abstraction around Prisma.

- [ ] **Step 4: Replace the current delete authorization and add archive**

In `app/dashboard/reports/actions.ts`:

1. Validate CSRF with `validateCSRF(await headers())`.
2. Require `ADMIN`; remove the existing BMC/BNM delete authorization.
3. Preserve the current HEAD OFFICE restriction.
4. For archive, select `status`, `items`, branch/store identity, and related PJUMs inside one transaction.
5. Reject missing, `DRAFT`, already archived, incomplete Preventive evidence, and approved PJUM before mutation.
6. Apply the pure detachment plan.
7. Archive with:

```ts
await tx.report.update({
    where: { reportNumber },
    data: {
        status: "ARCHIVED_PREVENTIVE",
        pjumExportedAt: null,
    },
});

await tx.activityLog.create({
    data: {
        reportNumber,
        actorNIK: user.NIK,
        action: "ADMIN_ARCHIVED_PREVENTIVE",
        notes: `Status sebelumnya: ${report.status}`,
    },
});
```

8. For permanent delete, reject a mismatched confirmation before opening the transaction, then load/check PJUMs before deleting approval logs, activity logs, and the report.
9. Do not call any Google Drive delete helper.
10. Revalidate:

```ts
[
    "/dashboard/reports",
    "/dashboard/materials",
    "/dashboard/pjum",
    "/dashboard/preventive",
    "/dashboard",
    `/reports/${reportNumber}`,
    `/dashboard/reports/${reportNumber}`,
].forEach((path) => revalidatePath(path));
```

Return specific user-facing errors for role, missing report, archive state, incomplete evidence, confirmation mismatch, approved PJUM, and HEAD OFFICE. Log unexpected errors without returning their internals.

- [ ] **Step 5: Run focused checks**

```bash
npx tsx lib/report-retention.spec.ts
npx tsx lib/report-preventive.spec.ts
npx eslint lib/report-retention.ts lib/report-retention.spec.ts app/dashboard/reports/actions.ts
npx tsc --noEmit
git diff --check
```

Expected: both assertion scripts pass; all static checks exit 0.

- [ ] **Step 6: Review transaction safety and commit Task 3**

Review in this order:

- no mutation happens before approved-PJUM/completeness validation;
- archive preserves logs and `Report`;
- delete removes database rows only;
- both server actions are Admin-only even if called without the UI.

```bash
git add lib/report-retention.ts lib/report-retention.spec.ts app/dashboard/reports/actions.ts
git commit -m "feat: add admin report archive"
```

Stop and wait for `lanjut`.

---

### Task 4: Align Every Preventive Consumer

**Files:**

- Modify: `app/dashboard/preventive/actions.ts`
- Modify: `app/admin/export/queries.ts`
- Modify: `app/reports/actions/queries.ts`

- [ ] **Step 1: Update dashboard/history to the shared SQL rule**

In `getAdminPreventive`, replace:

```sql
r."status" = 'COMPLETED'::"ReportStatus"
```

and the current `EXISTS` check with:

```ts
completePreventiveEvidenceSql({
    statusColumn: Prisma.sql`r."status"`,
    itemsColumn: Prisma.sql`r."items"`,
})
```

Keep the current `createdAt` year window, branch scoping, issue count, ordering, and quarter selection.

- [ ] **Step 2: Fix Preventive year discovery and BNM access**

Allow `BNM_MANAGER` in `getReportYears`. Replace the two `findFirst({ status: "COMPLETED" })` calls with one branch-scoped raw query returning `MIN("createdAt")` and `MAX("createdAt")` under the shared complete-evidence SQL predicate. Fall back to the current Jakarta year when no qualifying report exists.

- [ ] **Step 3: Update Preventive XLSX**

In `fetchPreventiveExportRows`, use `getJakartaYear()` for the default year and replace the COMPLETED/any-I-item predicate with the same `completePreventiveEvidenceSql(...)`. Preserve assigned-branch scope, workbook shape, cell types, and filename.

Do not change the operational report/material sheets in this step.

- [ ] **Step 4: Update BMS badge, cooldown, and latest date**

In `getStoresByBranch`:

- use `getJakartaYear()`, `getJakartaCurrentQuarter()`, and `getJakartaQuarterWindow()`;
- load non-draft reports in that Jakarta window;
- add a store only when `isRecordedPreventiveReport(report)` is true.

In `getLastCategoryIDate`, remove the arbitrary `take: 10`/`itemId.startsWith("I")` scan. Query the newest qualifying report with the shared SQL predicate and return its `createdAt` ISO string.

- [ ] **Step 5: Run focused checks**

```bash
npx tsx lib/report-preventive.spec.ts
npx eslint app/dashboard/preventive/actions.ts app/admin/export/queries.ts app/reports/actions/queries.ts lib/report-preventive.ts lib/report-preventive-sql.ts
npx tsc --noEmit
git diff --check
```

Expected: assertions pass; all static checks exit 0.

- [ ] **Step 6: Review agreement and commit Task 4**

Confirm dashboard, history, XLSX, badge, cooldown, latest date, and archive validation all require the same canonical item set and valid conditions. Confirm archive is included because only `DRAFT` is excluded.

```bash
git add app/dashboard/preventive/actions.ts app/admin/export/queries.ts app/reports/actions/queries.ts
git commit -m "fix: align preventive evidence consumers"
```

Stop and wait for `lanjut`.

---

### Task 5: Remove Archived Reports from Operational Surfaces

**Files:**

- Modify: `app/dashboard/reports/actions.ts`
- Modify: `app/admin/export/queries.ts`
- Modify: `app/dashboard/queries.ts`
- Modify: `app/dashboard/branches/actions.ts`
- Modify: `app/dashboard/pjum/actions.ts`
- Modify: `app/dashboard/intervensi/revisi-laporan/data.ts`
- Modify: `app/reports/actions/queries.ts`
- Modify: `app/reports/[reportNumber]/page.tsx`
- Modify: `app/dashboard/reports/[reportNumber]/page.tsx`

- [ ] **Step 1: Exclude archive from report lists and operational export**

- Add `{ status: { not: "ARCHIVED_PREVENTIVE" } }` as a mandatory `AND` predicate in `getAdminReports` so no filter can override it.
- Keep `ARCHIVED_PREVENTIVE` out of `getMyReports` even if a crafted status value is submitted.
- Change `buildReportWhere` in `app/admin/export/queries.ts` to exclude both `DRAFT` and archive. The Preventive export keeps its separate shared evidence predicate.

- [ ] **Step 2: Exclude archive at dashboard aggregation boundaries**

Use:

```ts
status: {
    notIn: [...OPERATIONAL_EXCLUDED_REPORT_STATUSES],
}
```

for every current `{ not: "DRAFT" }` operational base in `app/dashboard/queries.ts` and `app/dashboard/branches/actions.ts`, including the raw branch SQL equivalent.

In `fetchActivityLogs`, combine the caller predicate with:

```ts
{ report: { status: { not: "ARCHIVED_PREVENTIVE" } } }
```

so BMS, branch, BMC history, and global operational activity feeds share one exclusion. Add the same relation filter to the direct branch-detail activity query in `app/dashboard/branches/actions.ts`.

- [ ] **Step 3: Exclude archive from PJUM and intervention candidates**

- In `app/dashboard/pjum/actions.ts`, change the non-completed branch to `notIn: ["COMPLETED", "ARCHIVED_PREVENTIVE"]`.
- In `app/dashboard/intervensi/revisi-laporan/data.ts`, change the unique lookup to `findFirst` with `status: { not: "ARCHIVED_PREVENTIVE" }`.

Do not loosen any explicit workflow status list.

- [ ] **Step 4: Enforce read-only access**

In `app/reports/[reportNumber]/page.tsx`, add:

```ts
status: { not: "ARCHIVED_PREVENTIVE" },
```

to the BMS detail query.

In `canAccessDashboardReport`:

```ts
if (
    report.status === "ARCHIVED_PREVENTIVE" &&
    user.role === "BMS"
) {
    return false;
}
```

Keep existing Admin access and branch-scoped BMC/BNM access. Approval context remains absent because archive matches no approval status.

- [ ] **Step 5: Audit status predicates**

Run:

```bash
rg -n --glob '!node_modules/**' --glob '!.next/**' 'status:\s*\{\s*not:\s*"DRAFT"|status" <> ''DRAFT''' app lib
```

Expected: only intentional Preventive queries remain, or no matches after those queries move to shared helpers. Review each match; do not bulk replace blindly.

- [ ] **Step 6: Run focused checks**

```bash
npx eslint app/dashboard/reports/actions.ts app/admin/export/queries.ts app/dashboard/queries.ts app/dashboard/branches/actions.ts app/dashboard/pjum/actions.ts app/dashboard/intervensi/revisi-laporan/data.ts app/reports/actions/queries.ts app/reports/[reportNumber]/page.tsx app/dashboard/reports/[reportNumber]/page.tsx
npx tsc --noEmit
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 7: Review and commit Task 5**

Confirm no archived report appears in operational list/export/KPI/activity/PJUM/intervention/BMS detail, while dashboard detail still permits Admin and assigned-branch BMC/BNM.

```bash
git add app/dashboard/reports/actions.ts app/admin/export/queries.ts app/dashboard/queries.ts app/dashboard/branches/actions.ts app/dashboard/pjum/actions.ts app/dashboard/intervensi/revisi-laporan/data.ts app/reports/actions/queries.ts app/reports/[reportNumber]/page.tsx app/dashboard/reports/[reportNumber]/page.tsx
git commit -m "fix: exclude archived reports from operations"
```

Stop and wait for `lanjut`.

---

### Task 6: Add the Two Admin Danger-Zone Actions

**Files:**

- Modify: `app/dashboard/reports/[reportNumber]/_components/actions-tab.tsx`
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`

- [ ] **Step 1: Derive the two action states**

Use `hasCompletePreventiveEvidence(report.items)` in the workbench:

```ts
const isArchived = report.status === "ARCHIVED_PREVENTIVE";
const hasPreventiveEvidence = hasCompletePreventiveEvidence(report.items);
const canArchive =
    viewerRole === "ADMIN" &&
    hasPreventiveEvidence &&
    !isArchived;
```

Keep the Aksi tab Admin-only. Pass `canArchive`, `onArchiveClick`, and `onDeleteClick` to `ActionsTab`.

- [ ] **Step 2: Split the Danger Zone into archive and delete cards**

Archive card:

- render only when `canArchive`;
- explain that the operational report disappears but Preventive evidence stays;
- open a confirmation dialog with no reason field.

Delete card:

- always render for Admin, including archived reports;
- say database records are permanently removed;
- explicitly say Google Drive files are not deleted;
- warn when `hasPreventiveEvidence` that the store may lose its Preventive status.

- [ ] **Step 3: Add separate dialogs**

Archive dialog calls:

```ts
await archiveAdminReport(report.reportNumber);
```

On success, toast, close, and route to `/dashboard/preventive`.

Delete dialog uses the existing `Input` component:

```tsx
<Input
    value={deleteConfirmation}
    onChange={(event) => setDeleteConfirmation(event.target.value)}
    placeholder={report.reportNumber}
    autoComplete="off"
/>
```

Disable permanent delete until:

```ts
deleteConfirmation === report.reportNumber
```

Call:

```ts
await deleteAdminReport(
    report.reportNumber,
    deleteConfirmation,
);
```

On success, route to `/dashboard/reports`.

Use separate transitions so one action cannot show the other action's loading state. Show server errors verbatim in the toast description so approved-PJUM and stale-state failures are actionable.

- [ ] **Step 4: Run focused checks**

```bash
npx eslint app/dashboard/reports/[reportNumber]/_components/actions-tab.tsx app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx
npx tsc --noEmit
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Quick UI review**

With a local database that has the migration:

- Admin + complete normal report: Archive and Permanent Delete visible.
- Admin + incomplete report: only Permanent Delete visible.
- Admin + archived report: only Permanent Delete visible.
- BMC/BNM archived detail: no Aksi tab, data readable.
- BMS archived direct URL: not found/redirected.
- Archive dialog has no reason input.
- Delete remains disabled until exact report number is typed.

Do not use production data for this review.

- [ ] **Step 6: Commit Task 6**

```bash
git add app/dashboard/reports/[reportNumber]/_components/actions-tab.tsx app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx
git commit -m "feat: add report archive danger zone"
```

Stop and wait for `lanjut`.

---

### Task 7: Final Regression and Production-Safety Review

**Files:**

- Verify all files changed in Tasks 1-6.
- Update this plan's checkboxes only as each task actually completes.

- [ ] **Step 1: Run focused executable checks**

```bash
npx tsx lib/report-preventive.spec.ts
npx tsx lib/report-retention.spec.ts
```

Expected:

```text
report preventive assertions passed
report retention assertions passed
```

- [ ] **Step 2: Validate Prisma without touching a database**

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

Expected: schema formatted, valid, and client generated. Do not run a migrate command.

- [ ] **Step 3: Run repository checks**

```bash
npx eslint lib/report-preventive.ts lib/report-preventive-sql.ts lib/report-preventive.spec.ts lib/report-retention.ts lib/report-retention.spec.ts lib/report-status.ts app/dashboard/reports/actions.ts app/dashboard/preventive/actions.ts app/admin/export/queries.ts app/reports/actions/queries.ts app/dashboard/queries.ts app/dashboard/branches/actions.ts app/dashboard/pjum/actions.ts app/dashboard/intervensi/revisi-laporan/data.ts app/reports/[reportNumber]/page.tsx app/dashboard/reports/[reportNumber]/page.tsx app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts app/dashboard/reports/[reportNumber]/_components/actions-tab.tsx app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Review the final diff against the approved spec**

Run:

```bash
git diff main...HEAD --stat
git diff main...HEAD
rg -n "TODO|FIXME|PLACEHOLDER|ARCHIVED_PREVENTIVE|ADMIN_ARCHIVED_PREVENTIVE" lib app prisma
```

Confirm:

- migration has enum additions only;
- archive keeps `Report`, evidence, logs, and photos;
- delete requires exact confirmation and never calls Drive deletion;
- approved PJUM blocks both mutations before any write;
- Preventive surfaces include archive and agree on complete evidence;
- operational surfaces exclude archive;
- Admin-only mutation and BMS denial are server-enforced;
- no restore/archive-list/reason feature slipped in.

- [ ] **Step 5: Record verification and stop before production**

If verification fixes changed code, rerun the relevant checks and commit only those fixes:

```bash
git status --short
git add -u
git commit -m "fix: harden report archive flow"
```

Report the exact checks and results. Do not push, deploy, connect to production PostgreSQL, or run `prisma migrate deploy` until the user explicitly authorizes the next step.
