# Contextualize admin recent activity

## Scope

Replaced the admin recent-activity card's local action-label map with a typed
adapter that delegates to the shared contextual activity formatter. Schema,
migrations, activity data, statuses, actions, filters, badges, layout, and
workflow remain unchanged.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `.superpowers/sdd/task-3-report.md` and `.superpowers/sdd/task-6-report.md`.
- `docs/agent-notes/2026-08-14-1217-activity-context-query-lists.md` and
  `docs/agent-notes/2026-08-14-1230-admin-report-history-context.md`.
- Current `ActivityItem`, shared activity formatter, and admin dashboard.

## Changed Files

- `app/dashboard/_components/admin/admin-activity-label.ts`: adds the typed
  adapter for admin recent-activity labels.
- `app/dashboard/_components/admin/admin-activity-label.spec.ts`: covers
  checklist-only and estimation wording through the adapter.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: delegates each
  recent-activity label to the adapter and removes the local label map.
- `docs/agent-notes/2026-08-14-1309-admin-recent-activity-context.md`:
  records this bounded change.

## Decisions

- The adapter accepts only the activity action and already-derived
  `isChecklistOnly` boolean, preserving the server/client boundary.
- Badge classes, table markup, chronology, and report links are unchanged.

## Verification

- RED: the new adapter spec failed with `MODULE_NOT_FOUND` before the adapter
  existed.
- GREEN: focused adapter and shared activity-label specs passed.
- Focused ESLint and TypeScript (`--noEmit --incremental false` with a 4 GB
  heap) passed.
- The stale-label search found only the unchanged SLA wording in the admin
  dashboard; no rendered local activity-label map remains.
- Task-note assertions and `git diff --check` passed.

## Remaining Work and Risks

None.
