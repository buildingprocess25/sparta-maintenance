# Define BMS Report Tour Steps Data Module

## Scope

Created pure data module and assertion spec for BMS report creation guide tour steps (`BmsWizardStep`, `BmsReportTourStep`, and `getBmsReportTourSteps(isEditMode)`). UI components and wizard changes are outside this task's scope.

## Context and Sources

- `.superpowers/sdd/task-1-brief.md`
- `docs/superpowers/plans/2026-07-28-bms-report-guide.md`
- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`
- `app/reports/(bms)/create/components/report-wizard-shell.tsx`

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: Defined data types, tour step definitions, and `getBmsReportTourSteps` selector helper.
- `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`: Added assertion spec verifying step order for create mode (4 steps) and revision mode (3 steps), plus target attributes.

## Decisions

- Target attributes use `data-tour`: `bms-report-store`, `bms-report-checklist`, `bms-report-estimation`, and `bms-report-submit`.
- `getBmsReportTourSteps(false)` returns all 4 wizard steps (`store`, `checklist`, `estimation`, `review`).
- `getBmsReportTourSteps(true)` filters out `store` step to return 3 steps (`checklist`, `estimation`, `review`).

## Verification

- Ran `npx tsx "app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts"` before module creation: failed with `MODULE_NOT_FOUND` (exit code 1).
- Ran `npx tsx "app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts"` after module creation: passed successfully with output `bms-report-tour-steps spec tests passed` (exit code 0).

## Remaining Work and Risks

None. Task 1 is self-contained.
