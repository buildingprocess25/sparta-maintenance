# Design BMS input guide revision

## Scope

Document the approved revision from broad BMS wizard guidance to contextual
checklist and estimation guidance. No application code changes in this task.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-bms-report-guide-design.md`
- `app/reports/(bms)/create/components/checklist-step.tsx`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- User-approved interaction-driven guide design.

## Changed Files

- `docs/superpowers/specs/2026-07-28-bms-input-guide-revision-design.md`:
  defines the revised guide behavior and acceptance criteria.

## Decisions

- Remove store and review guidance because they do not provide an actionable
  input instruction.
- Make conditional controls advance only after the user exposes them; the
  guide never changes form values or opens an action surface.

## Verification

- Reviewed the checklist conditional fields and estimation dialog/action-menu
  structure against the documented target sequence.

## Remaining Work and Risks

- The user must review this written spec before an implementation plan is
  created.
