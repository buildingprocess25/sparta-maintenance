# Plan: PJUM Revision Bugfixes

## 1. Context and Objective
This plan addresses two bugs discovered during manual testing of the PJUM revision feature:
1. **Notification Text:** When a PJUM is rejected/requested for revision by BNM, the notification says "PJUM ditolak". It needs to say "PJUM diminta revisi".
2. **Hanging Report Selection Lock:** When revising a PJUM (Submit Ulang PJUM), hanging reports (laporan gantung) that were already exported in that PJUM are incorrectly treated as non-hanging because they have `pjumExportedAt` populated. This allows the BMC user to uncheck them, which violates the mandatory inclusion rule. Additionally, out-of-range hanging reports might be excluded entirely from the candidates list.

## 2. File Structure Changes
The changes will be localized to existing files:
- `lib/notifications/templates.ts`: Update the `PJUM_REJECTED` notification copy.
- `app/dashboard/pjum/actions.ts`: Update `searchDashboardPjumCandidates` to properly inject `editingReportNumbers` into the database query and correctly evaluate `isHangingReport` for reports being actively edited.

## 3. Tasks

### Task 1: Update Notification Copy
1. **File to edit:** `lib/notifications/templates.ts`
2. **Action:** Locate the `PJUM_REJECTED` case in the switch statement (around line 166).
3. **Action:** Change `title: "PJUM ditolak"` to `title: "PJUM diminta revisi"`.
4. **Action:** Commit the change with message `fix: update PJUM rejection notification title`.

### Task 2: Fix Hanging Report Evaluation in Revision Mode
1. **File to edit:** `app/dashboard/pjum/actions.ts`
2. **Action:** Locate `searchDashboardPjumCandidates`. Move the resolution of `editingReportNumbers` (fetching the existing PJUM's report numbers) up, before calling `getDashboardPjumReportsInRange`.
3. **Action:** Update the call to `getDashboardPjumReportsInRange` to pass `editingReportNumbers: Array.from(editingReportNumbers)` as a new parameter.
4. **Action:** Locate the definition of `getDashboardPjumReportsInRange`. Update its parameter interface to accept `editingReportNumbers?: string[]`.
5. **Action:** In `getDashboardPjumReportsInRange`, move the `OR` array into a local variable `orConditions`. If `editingReportNumbers` is provided and has items, push a new condition `{ reportNumber: { in: editingReportNumbers } }` into `orConditions`.
6. **Action:** In `searchDashboardPjumCandidates`, locate the evaluation of `isHangingReport`. Update it to correctly consider a report as hanging if it is currently being edited:
```typescript
const isHangingReport = Boolean(
    report.pjumHangingAt &&
        !report.pjumExpiredAt &&
        (!report.pjumExportedAt || editingReportNumbers.has(report.reportNumber))
);
```
7. **Action:** Run a `build:memory` to ensure TypeScript compiles successfully without parameter errors.
8. **Action:** Commit the change with message `fix: enforce hanging report lock during PJUM revision`.
