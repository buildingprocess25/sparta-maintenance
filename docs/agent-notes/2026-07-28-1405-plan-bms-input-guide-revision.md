# Plan BMS input guide revision

## Scope

Create the executable implementation plan for the approved BMS input-guide revision. Application code is unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-bms-input-guide-revision-design.md`
- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `app/reports/(bms)/create/components/checklist-step.tsx`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`

## Changed Files

- `docs/superpowers/plans/2026-07-28-bms-input-guide-revision.md`: defines TDD steps, targets, and verification.

## Decisions

- Use a single-step, target-aware Joyride lifecycle so hidden fields and closed action surfaces cannot trap an overlay.
- Keep selectors on existing field/action wrappers; do not add new UI.

## Verification

- Reviewed the plan against the approved spec, mapped all acceptance criteria to tasks, and scanned it for unresolved placeholders.

## Remaining Work and Risks

- Implementation has not started and requires an execution choice.
