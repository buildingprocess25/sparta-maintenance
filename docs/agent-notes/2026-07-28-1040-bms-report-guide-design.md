# Define BMS report guide

## Scope

Record the approved design for a BMS report-creation guide. Runtime code,
schema, migrations, and deployment configuration are unchanged.

## Context and Sources

- `app/dashboard/reports/[reportNumber]/_components/approval-review-tour.tsx`
- `app/dashboard/reports/[reportNumber]/_components/report-detail-workbench.tsx`
- `app/reports/(bms)/create/create-form.tsx`
- `app/reports/(bms)/create/components/store-step.tsx`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- `app/reports/(bms)/create/components/review-step.tsx`

## Changed Files

- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`: records
  the approved BMS guide scope and behavior.

## Decisions

- Use one BMS-specific Joyride component instead of extending the approval
  guide, because BMS report creation has different targets and no approval
  status.
- Limit the first release to the existing report-creation and revision wizard.
- Keep daily dismissal in browser storage and do not add persistent storage.

## Verification

- Compared the BMC/BNM approval tour and its selectors with the current BMS
  wizard's store, checklist, estimation, and review flow.
- Performed a spec self-review for scope, contradictions, and placeholders.

## Remaining Work and Risks

- Write and review the implementation plan before changing runtime code.
