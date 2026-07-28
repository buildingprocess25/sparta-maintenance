# Plan BMS report guide

## Scope

Record the implementation plan for the approved BMS report guide and clarify
that guide tooltips follow normal wizard navigation. Runtime code, schema,
migrations, and deployment configuration are unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`
- `app/dashboard/reports/[reportNumber]/_components/approval-review-tour.tsx`
- `app/reports/(bms)/create/create-form.tsx`
- `package.json`

## Changed Files

- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`: clarifies
  interactive, normal-navigation behavior for BMS.
- `docs/superpowers/plans/2026-07-28-bms-report-guide.md`: implementation
  tasks, interfaces, checks, and commit boundaries.

## Decisions

- Show one BMS tooltip after the user reaches each wizard step through normal
  navigation; the guide never calls wizard navigation or validation handlers.
- Extract the existing tooltip for two report tours instead of duplicating
  custom UI.
- Use a small `tsx` assertion file for pure create/revision step definitions;
  the repository has no general component-test runner.

## Verification

- Traced BMS wizard state, validations, footer action, and current BMC/BNM
  Joyride implementation.
- Reviewed package scripts and confirmed `tsx`, ESLint, and production build
  are available for the planned checks.
- Performed a plan self-review for scope, placeholders, and interface names.

## Remaining Work and Risks

- Runtime implementation and browser verification are pending execution.
