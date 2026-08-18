# Fix BMS tour completion and scroll

## Scope

Fix the BMS report guide so its final Next action ends the guide and each
highlighted target is centered in the viewport. No database or migration work.

## Context and Sources

- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`
- `react-joyride` installed scroll behavior

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour.tsx`: stop the final
  step from being reopened and center targets before displaying each step.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`: cover
  the completion guard and centered manual scrolling.

## Decisions

Mark the tour dismissed when Next advances beyond the last step, preventing the
existing target polling from restarting it. Disable Joyride's per-step scrolling
and use native `scrollIntoView` with `block: "center"` so it does not overwrite
the requested position.

## Verification

- `npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'`
  passed after the regression assertions initially failed before the patch.

## Remaining Work and Risks

Manual browser validation is still needed to confirm the visual position on a
small viewport.
