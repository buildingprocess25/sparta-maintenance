# Implement BMS report tour

## Scope

Add the BMS report-wizard tour and mount it in the existing create and
revision form. Database schema, migrations, server actions, and deployment
configuration remain unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`
- `docs/superpowers/plans/2026-07-28-bms-report-guide.md`
- `app/dashboard/reports/[reportNumber]/_components/approval-review-tour.tsx`
- `app/reports/(bms)/create/create-form.tsx`

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour.tsx`: renders the
  BMS guide for the current wizard step.
- `app/reports/(bms)/create/create-form.tsx`: mounts the guide with the
  existing wizard step and edit-mode state.

## Decisions

- The guide follows normal wizard navigation and never changes form data or
  calls navigation and submit handlers.
- A skipped guide is suppressed for the current page visit; the checkbox uses
  the existing Jakarta-date local-storage pattern.
- BMS permits target interaction while the approval tour remains blocking.

## Verification

- Focused BMS guide lint and the step-definition assertion are recorded in
  the final integration task.

## Remaining Work and Risks

- Final mobile create/revision browser verification remains part of the
  integration task.
