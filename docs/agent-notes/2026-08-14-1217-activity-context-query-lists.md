# Add activity checklist context to query and lists

## Scope

Added server-derived checklist context to report activity data and used it to
render the existing shared activity labels across the requested dashboard and
history list surfaces. Schema, migrations, persisted activity actions,
workflow transitions, filter values, badge colors, and report item payloads
sent to clients remain unchanged.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/agent-notes/2026-08-14-1145-plan-contextual-checklist-labels.md`.
- `docs/agent-notes/2026-08-14-1201-contextual-checklist-labels-implementation.md`.
- `docs/agent-notes/2026-08-14-1214-centralize-contextual-activity-labels.md`.
- Current `ActivityItem`, dashboard branch activity query, and activity-list
  consumers.

## Changed Files

- `app/dashboard/queries.ts`: selects items internally, derives
  `isChecklistOnly`, and omits items from returned activity reports.
- `app/dashboard/branches/actions.ts`: adds the same server-only boolean for
  the branch dashboard's separate activity query.
- `app/dashboard/_components/manager-dashboard.tsx`,
  `components/bms-mobile/bms-activity-item.tsx`, and
  `app/dashboard/branches/[branchName]/page.tsx`: pass checklist context to
  the shared formatter.
- `app/activity/_components/activity-list.tsx` and
  `app/reports/history/_components/bmc-history-list.tsx`: use the shared
  contextual label helper while preserving their action color maps and filter
  values.

## Decisions

- `isChecklistOnlyReport` remains the canonical predicate for persisted
  `ReportItemJson[]` values.
- Only the derived boolean crosses the server/client boundary; item JSON is
  destructured out before `ActivityItem` is returned.
- The branch dashboard requires its own derivation because it does not consume
  `ActivityItem` and fetches recent activity through a separate server action.

## Verification

- RED: `node --max-old-space-size=4096 .\\node_modules\\typescript\\bin\\tsc --noEmit --incremental false` exited 1 after the
  required `ActivityItem.isChecklistOnly` field was added, with TS2322 at
  `app/dashboard/queries.ts(578,5)` reporting the property was missing.
- GREEN: the same TypeScript command exited 0 after both server mappings and
  consumers supplied the boolean.
- `node .\\node_modules\\tsx\\dist\\cli.mjs lib\\report-activity-label.spec.ts`
  (with the required tsx bootstrap) printed `report activity label tests
  passed`.
- Focused ESLint exited 0 with two pre-existing warnings in the untouched
  portions of `components/bms-mobile/bms-activity-item.tsx` (`ArrowUpRight`
  and `Icon` unused); it reported no errors.
- `git diff --check` exited 0.

## Remaining Work and Risks

None. Full-repository lint was not run because its baseline has known
pre-existing failures; focused lint covered every Task 3 source file.
