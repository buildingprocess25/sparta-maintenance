# BMS Active Report And Realisasi UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BMS sees clearer over-balance realization messaging, cannot start a new report while a relevant active report is unfinished, and old unrelated reports do not block new work.

**Architecture:** Add one shared report-blocker helper in `lib/` so dashboard, reports list, create page, and server submit use the same active-period/cutover rule. Keep over-balance wording and the 250-character reason limit in shared constants, then reuse them in BMS completion and manager/BMS detail views.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Prisma, shadcn/ui, lucide-react, Node `assert` specs via TSX register.

## Global Constraints

- BMS active report blocking only applies to reports owned by that BMS.
- Old reports must not block unless they belong to the current active balance period or were created after the 2026-09-03 Asia/Jakarta cutover.
- Terminal/non-blocking statuses are `COMPLETED`, `ESTIMATION_REJECTED`, and `ARCHIVED_PREVENTIVE`.
- Realisasi over sisa saldo tetap boleh submit only when a required reason is provided.
- Over-balance reason max length is 250 characters.
- Use existing shadcn/ui components before custom markup.

---

### Task 1: Shared Active Report Blocker

**Files:**
- Create: `lib/bms-active-report-blocker.ts`
- Test: `lib/bms-active-report-blocker.spec.ts`
- Modify: `lib/balance.ts`

**Interfaces:**
- Produces: `BMS_ACTIVE_REPORT_BLOCKING_STATUSES`, `BMS_ACTIVE_REPORT_BLOCKER_CUTOVER`, `buildBmsActiveReportBlockerWhere(input)`, `formatBmsActiveReportBlockerMessage(report)`, and `getBmsActiveReportBlocker(bmsNIK, options?)`.
- Consumes: Prisma `ReportStatus`, `getReportStatusLabel`, and existing `getBmsActivePeriod`.

- [ ] **Step 1: Write the failing helper spec**

```ts
import assert from "node:assert/strict";
import { ReportStatus } from "@prisma/client";
import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    BMS_ACTIVE_REPORT_BLOCKING_STATUSES,
    buildBmsActiveReportBlockerWhere,
    formatBmsActiveReportBlockerMessage,
} from "./bms-active-report-blocker";

assert(BMS_ACTIVE_REPORT_BLOCKING_STATUSES.includes(ReportStatus.IN_PROGRESS));
assert(!BMS_ACTIVE_REPORT_BLOCKING_STATUSES.includes(ReportStatus.COMPLETED));
assert(!BMS_ACTIVE_REPORT_BLOCKING_STATUSES.includes(ReportStatus.ESTIMATION_REJECTED));
assert(!BMS_ACTIVE_REPORT_BLOCKING_STATUSES.includes(ReportStatus.ARCHIVED_PREVENTIVE));

const where = buildBmsActiveReportBlockerWhere({
    bmsNIK: "12345678",
    activePeriodId: "period-1",
    excludeReportNumber: "AH01-2609-001",
});

assert.equal(where.createdByNIK, "12345678");
assert.deepEqual(where.reportNumber, { not: "AH01-2609-001" });
assert.deepEqual(where.status, { in: BMS_ACTIVE_REPORT_BLOCKING_STATUSES });
assert.deepEqual(where.OR, [
    { balancePeriodId: "period-1" },
    { balancePeriodId: null, createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER } },
]);

assert.equal(
    formatBmsActiveReportBlockerMessage({
        reportNumber: "AH01-2609-002",
        status: ReportStatus.PENDING_REVIEW,
    }),
    "Anda bisa membuat laporan baru setelah laporan AH01-2609-002 berstatus Selesai. Status saat ini: Review BMC.",
);
```

- [ ] **Step 2: Run the spec to confirm it fails**

Run: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/bms-active-report-blocker.spec.ts")'`

Expected: FAIL because `lib/bms-active-report-blocker.ts` does not exist.

- [ ] **Step 3: Implement the helper and balance query**

Add `lib/bms-active-report-blocker.ts` with the exact exported constants/functions above. Add `getBmsActiveReportBlocker` to `lib/balance.ts`, using the helper where builder and selecting `reportNumber`, `storeName`, `storeCode`, `status`, `createdAt`, and `updatedAt`.

- [ ] **Step 4: Run the spec to confirm it passes**

Run: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/bms-active-report-blocker.spec.ts")'`

Expected: no output, exit code 0.

### Task 2: Prevent New Report Creation

**Files:**
- Create: `app/reports/_components/bms-create-report-button.tsx`
- Modify: `app/dashboard/_components/bms-dashboard.tsx`
- Modify: `app/reports/page.tsx`
- Modify: `app/reports/_components/bms-mobile-reports-list.tsx`
- Modify: `app/reports/_components/bms-reports-list.tsx`
- Modify: `app/reports/(bms)/create/page.tsx`
- Modify: `app/reports/actions/submit.ts`

**Interfaces:**
- Consumes: `getBmsActiveReportBlocker`, `formatBmsActiveReportBlockerMessage`, and `BmsActiveReportBlockerSummary`.
- Produces: a reusable client button that either links to `/reports/create` or shows a toast when a blocker exists.

- [ ] **Step 1: Add reusable button**

Create `BmsCreateReportButton` client component. With no blocker, it renders a normal shadcn `Button` plus `Link`; with a blocker, it renders a button that calls `toast.warning("Laporan aktif belum selesai", { description: formatBmsActiveReportBlockerMessage(blocker) })`.

- [ ] **Step 2: Add UX guards**

Use `getBmsActiveReportBlocker(user.NIK)` in dashboard and reports page. Pass the blocker into the reusable button in dashboard, mobile list, and desktop list.

- [ ] **Step 3: Add direct URL guard**

In `app/reports/(bms)/create/page.tsx`, if a blocker exists, render `BmsMobilePage` with an `Alert`, the blocker message, and a button to open `/reports/{reportNumber}` instead of rendering the wizard.

- [ ] **Step 4: Add server action guard**

In `submitReport`, call `getBmsActiveReportBlocker(user.NIK, { excludeReportNumber: data.draftReportNumber })` after CSRF validation. Return `{ error: formatBmsActiveReportBlockerMessage(blocker) }` when present.

### Task 3: Over-Balance Realisasi UX

**Files:**
- Create: `lib/unexpected-cost.ts`
- Modify: `app/reports/[reportNumber]/completion/completion-client.tsx`
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts`
- Modify: `app/reports/actions/submit-completion-work.ts`
- Modify: `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`
- Modify: `app/dashboard/reports/[reportNumber]/_components/work-cost-tab.tsx`
- Modify: `app/reports/[reportNumber]/report-detail-view.tsx`

**Interfaces:**
- Produces: shared copy constants and `UNEXPECTED_COST_NOTES_MAX_LENGTH = 250`.
- Consumes: existing `unexpectedCostNotes` report field.

- [ ] **Step 1: Add shared copy constants**

Create `lib/unexpected-cost.ts` with title, short label, description, placeholder, and max-length constants.

- [ ] **Step 2: Update completion form**

Render `BmsBalanceCard` on completion page, update copy to “Alasan realisasi melebihi sisa saldo dana taktis”, set textarea `maxLength={250}`, slice input to 250 chars, and show a character counter.

- [ ] **Step 3: Update client and server validation**

In the hook, require the reason when over budget and reject notes over 250 chars. In the server action, trim once, reject missing/too-long notes, and persist only the trimmed safe value.

- [ ] **Step 4: Update detail and BMC review display**

Add an over-balance badge beside report number/status/item badges when `unexpectedCostNotes` exists. Rename orange cards from “Biaya Tak Terduga” to “Alasan realisasi melebihi sisa saldo dana taktis”.

### Task 4: Docs, Note, And Verification

**Files:**
- Modify: `docs/project/10-bms-weekly-balance.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-bms-active-report-realisasi-ux.md`

**Interfaces:**
- Consumes: project task note template.
- Produces: canonical documentation and task note for this behavior change.

- [ ] **Step 1: Update canonical docs**

Document the BMS active-report lock and the renamed over-balance reason.

- [ ] **Step 2: Create task note**

Create a dated Asia/Jakarta note from `docs/agent-notes/TEMPLATE.md`.

- [ ] **Step 3: Run verification**

Run helper spec, TypeScript, task-note check, and `git diff --check`.

