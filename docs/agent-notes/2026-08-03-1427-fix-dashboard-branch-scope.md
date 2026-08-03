# Fix Dashboard Branch Scope Review

## Scope

Fixes the loop leak in `getAdminBranchPerformance` that ignored `visibleBranchNames` and restored accidentally removed fields (`status`, `stuckReports`, `pjum`) in `AdminCommandCenterDataBreakdown` and `brandBreakdown`.

## Context and Sources

- `app/dashboard/queries.ts`
- Feedback from code review regarding Task 2.

## Changed Files

- `app/dashboard/queries.ts`: Corrected `getAdminBranchPerformance` loop leak and restored fields in `AdminCommandCenterDataBreakdown`.

## Decisions

- Replaced auto-creating `getBranchAccumulator` calls inside the `totalRows` and `completedRows` loops with explicit `branchMap.get()` lookups to ensure non-owned branches are not unintentionally added back to the accumulator map.
- Added `status`, `stuckReports`, and `pjum` fields back to the `AdminCommandCenterDataBreakdown` type and the `brandBreakdown` object initialization.

## Verification

- `npx tsc --noEmit` passed cleanly.

## Remaining Work and Risks

None.
