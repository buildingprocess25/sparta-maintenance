# BMS Balance Risk Fix Plan

## Scope

Created an implementation plan for two BMS balance risks found during branch analysis: PJUM lock bypass in photo start-work and missing balance validation on estimation resubmit.

## Context and Sources

- `AI_RULES.md`
- `AI_CONTEXT.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/agent-notes/2026-09-07-1130-update-bms-balance-cutover.md`
- `app/reports/actions/start-work-with-photos.ts`
- `app/reports/actions/resubmit.ts`
- `lib/balance.ts`

## Changed Files

- `docs/superpowers/plans/2026-09-18-bms-balance-risk-fixes.md`: Added a task-by-task implementation plan with focused tests, exact edit guidance, verification commands, and task-note requirements.
- `docs/agent-notes/2026-09-18-2205-bms-balance-risk-plan.md`: Recorded this planning task.

## Decisions

- Planned the fixes as two independent implementation tasks plus a final verification/task-note task.
- Kept the proposed changes inside existing server actions and existing balance helpers; no schema, migration, or UI changes are planned.

## Verification

- Read the relevant source files and existing focused specs.
- Created the plan document and reviewed it for coverage, placeholder language, and helper-name consistency.

## Remaining Work and Risks

- The plan has not been executed yet.
