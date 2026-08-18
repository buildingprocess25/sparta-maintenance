# Define actionable flows (BMS Input Guide)

## Scope

- Defines `BmsInputTourId`, `BmsInputTourStep`, and `getBmsInputTourSteps` to replace the old broad step definitions.
- Flow splits into `checklist` (4-5 steps) and `estimation` (9 steps).
- Excludes `store` and `review` steps from the tour entirely.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-07-28-bms-input-guide-revision.md` (Task 1)

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: Replaced broad steps with granular inputs.
- `app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts`: Added flow tests for `getBmsInputTourSteps`.

## Decisions

- Renamed targets according to plan (`bms-checklist-...` and `bms-estimation-...`).
- Handled `isRepairOnlyMode` by conditionally pushing the `condition` step.
- Included explanation for "BMS/Rekanan" and "Rp 0" pricing in tooltips.

## Verification

- `npx tsx 'app/reports/(bms)/create/components/bms-report-tour-steps.spec.ts'` completed successfully (GREEN).

## Remaining Work and Risks

- Tasks 2-4 from the plan are pending.
