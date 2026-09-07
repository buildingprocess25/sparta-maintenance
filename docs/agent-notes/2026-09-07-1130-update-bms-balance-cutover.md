# Update BMS Balance Cutover Date

## Scope

Change the global cutover date for the BMS balance feature from September 3 to September 1, 2026, and align the initial migration script and audit script to use this shared constant. This ensures that old garbage reports prior to September 1 do not deduct the initial BMS balance upon go-live.

## Context and Sources

- `lib/bms-active-report-blocker.ts` (source of truth for the cutover constant).
- `scripts/init-bms-balance-periods.ts` (migration script).
- `scripts/audit-bms-balance-cutover.ts` (audit script).
- Discussion on how old reports stuck in IN_PROGRESS would unfairly deduct the initial Rp 1.000.000 balance if not filtered.

## Changed Files

- `lib/bms-active-report-blocker.ts`: Updated `BMS_ACTIVE_REPORT_BLOCKER_CUTOVER` from Sep 3 to Sep 1.
- `scripts/init-bms-balance-periods.ts`: Added `createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER }` filter so old reports are orphaned instead of linked.
- `scripts/audit-bms-balance-cutover.ts`: Updated `unlinkedOpenReportCount` query to include the same cutover filter so the audit reflects actual migration behavior.

## Decisions

- Set cutover to Sept 1, 2026 to provide a clean boundary.
- Rather than auto-canceling old reports (which mutates historical states) or adding complex legacy exceptions to `calculateBmsBalance`, we simply leave them orphaned (`balancePeriodId = null`). They won't affect new balance calculations, and they won't block the user (due to the blocker using the same cutover date).

## Verification

- Ran `npm run audit:bms-balance-cutover` against the production DB.
- Verified that `unlinkedOpenReportCount` dropped from 592 to 424, confirming that ~168 old garbage reports were successfully filtered out of the migration scope.

## Remaining Work and Risks

None.
