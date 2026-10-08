# BMS Branch-Wide Store Coverage Feature Flag

## Scope

Implement feature flag `BMS_STORE_COVERAGE_MODE` in `lib/bms-coverage-config.ts` and update `getBmsPreventiveCoverage`, `getAssignedStoresForBms`, and the submit report coverage guard to allow BMS users to view and submit reports for all active stores in their branch while preserving legacy per-BMS assignment filtering logic.

## Context and Sources

- `app/dashboard/preventive/actions.ts`: `getBmsPreventiveCoverage`
- `app/reports/actions/queries.ts`: `getAssignedStoresForBms`
- `app/reports/actions/submit.ts`: Coverage guard in `submitReport`
- `docs/plans/2026-10-08-bms-branch-wide-stores-plan.md`

## Changed Files

- `lib/bms-coverage-config.ts`: Central feature flag `BMS_STORE_COVERAGE_MODE` ("BRANCH_WIDE" | "ASSIGNED_ONLY").
- `app/dashboard/preventive/actions.ts`: Updated `getBmsPreventiveCoverage` query to respect `BMS_STORE_COVERAGE_MODE`.
- `app/reports/actions/queries.ts`: Updated `getAssignedStoresForBms` to return all branch stores under `"BRANCH_WIDE"` mode.
- `app/reports/actions/submit.ts`: Updated coverage guard in `submitReport` to validate branch scope under `"BRANCH_WIDE"` mode.

## Decisions

- Default `BMS_STORE_COVERAGE_MODE` to `"BRANCH_WIDE"` as requested by user.
- Preserve full legacy assignment logic so setting mode to `"ASSIGNED_ONLY"` restores previous behavior cleanly.

## Verification

- `npx tsc --noEmit` check.

## Remaining Work and Risks

- None.
