# Hanging Report Identification Logic

## Scope

Updates the query logic in `searchDashboardPjumCandidates` to properly identify hanging reports based on `BmsBalancePeriod` status rather than merely comparing dates, ensuring left-behind reports are surfaced correctly while avoiding false positives for legacy reports.

## Context and Sources

- `docs/superpowers/specs/2026-08-24-hanging-report-logic-design.md`
- `app/dashboard/pjum/actions.ts`

## Changed Files

- `app/dashboard/pjum/actions.ts`: Updated `searchDashboardPjumCandidates` to include hybrid logic for legacy and new hanging reports.

## Decisions

Adopted a hybrid logic approach. For new reports with `balancePeriodId`, a report is hanging if its period status is `CLOSED`. For legacy reports (`balancePeriodId === null`), we fallback to the old date-based logic to avoid miscategorizing normal legacy reports.

## Verification

Manual verification logic update. Seed script will be updated next.

## Remaining Work and Risks

None
