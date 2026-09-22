# Fix Dashboard Active Reports Bug

## Scope

Added the missing `PENDING_CHECKLIST_REVIEW` status to the `pendingReviewReports` calculation in the Admin Command Center dashboard queries. Other dashboard metrics are intentionally out of scope.

## Context and Sources

- `app/dashboard/queries.ts`
- User report that active reports math (Total - Completed - Active - Rejected) was leaving a gap of 5 reports.
- Identified that `PENDING_CHECKLIST_REVIEW` is part of `MANAGER_ACTIVE_REPORT_STATUSES` but was omitted from the specific KPI summation loop.

## Changed Files

- `app/dashboard/queries.ts`: added `"PENDING_CHECKLIST_REVIEW"` to the array of statuses mapped to `pendingReviewReports` in `getAdminKpiMetric` and `getAdminBrandBreakdownKpi`.

## Decisions

- Included the missing status to ensure mathematical accuracy on the KPI dashboard without altering any other query logic or database queries.

## Verification

- `npm run build:memory` completed successfully (TypeScript compile passed).

## Remaining Work and Risks

None.
