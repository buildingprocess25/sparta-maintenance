# Plan contextual checklist labels

## Scope

Created a test-driven implementation plan for correcting submit guidance,
activity/history labels, filters, and notifications in checklist-only report
flows. No application code, schema, migration, or database data was changed.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/superpowers/plans/2026-08-12-pending-checklist-review-status.md`.
- `docs/agent-notes/2026-08-13-1031-implement-pending-checklist-review.md`.
- Current report creation, activity query/rendering, report detail, approval,
  notification, Prisma schema, and migration code.
- The agreed option to preserve existing enums and derive contextual wording
  from report item handlers.

## Changed Files

- `docs/superpowers/plans/2026-08-14-contextual-checklist-labels.md`: added
  the task-by-task TDD implementation plan and regression matrix.
- `docs/agent-notes/2026-08-14-1145-plan-contextual-checklist-labels.md`:
  recorded this planning task.

## Decisions

- No Prisma schema or migration change is planned.
- Stored report statuses and activity action values remain the workflow source
  of truth; wording is contextual presentation.
- A report is checklist-only when none of its items has `handler === "BMS"`.
- Raw report items are inspected on the server and reduced to a boolean before
  activity data reaches client components.
- Shared pure helpers and focused tests will prevent wording drift across UI
  surfaces.

## Verification

- Mapped every known label consumer in create review, BMS/BMC/BNM dashboards,
  branch and admin activity, both report history views, and notifications.
- Confirmed the plan includes RED/GREEN test steps, exact commands, bounded
  commits, a stale-label search, project checks, and a HEAD OFFICE regression
  matrix.
- Confirmed the plan explicitly excludes schema, migration, cleanup, and
  backfill work.

## Remaining Work and Risks

- The implementation plan has not yet been executed.
- Full TypeScript/build verification may require additional local memory; any
  resource failure must be recorded separately from code failures.
