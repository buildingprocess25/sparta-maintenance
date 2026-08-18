# Make Joyride conditional and target-aware (BMS Input Guide)

## Scope

- Refactored `BmsReportTour` to display a single tool-tip step based on a `stepIndex`.
- Joyride now waits via `document.querySelector` polling (100ms * 50 attempts) before activating the tooltip, accommodating dynamically rendered parts.
- Passed `isRepairOnlyMode` to conditionalize the tour steps.
- Removed obsolete `BMS_REPORT_TOUR_STEPS` definitions.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-07-28-bms-input-guide-revision.md` (Task 3)

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour.tsx`: Converted to index-based polling logic.
- `app/reports/(bms)/create/create-form.tsx`: Injected `isRepairOnlyMode` prop.
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: Cleaned up old types.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`: Added runtime integration spec.

## Decisions

- Polling for targets handles conditionally rendered elements like `DropdownMenuItem` or fields that only appear if a prior radio button is set.
- Joyride lifecycle uses `EVENTS.STEP_AFTER` and `ACTIONS.NEXT` to advance `stepIndex`.

## Verification

- The new spec test (`bms-report-tour-runtime.spec.ts`) runs successfully.

## Remaining Work and Risks

- Task 4 (End-to-End manual verification) is pending.
