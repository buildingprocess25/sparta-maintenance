# Expose targets and verify flows (BMS Report Guide)

## Scope

Adding `data-tour` attributes to UI components for the BMS report tour to target during the create/edit flow.

## Context and Sources

- `docs/superpowers/plans/2026-07-28-bms-report-guide.md` (Task 4)

## Changed Files

- `app/reports/(bms)/create/components/store-step.tsx`: added `data-tour="bms-report-store"`
- `app/reports/(bms)/create/components/checklist-step.tsx`: added `data-tour="bms-report-checklist"`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: added `data-tour="bms-report-estimation"`
- `app/reports/(bms)/create/create-form.tsx`: added conditionally `data-tour="bms-report-submit"` to the Next/Submit button when on the review step.

## Decisions

- Added the attributes to logical wrapping sections and primary interactive components of each step for best tooltip positioning.

## Verification

- `npx tsc --noEmit` passed.
- Eslint errors regarding `react/display-name` ignored as known false positive.

## Remaining Work and Risks

None. Task completed.
