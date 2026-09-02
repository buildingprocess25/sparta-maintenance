# Maintenance export status labels plan

## Scope

Created a rapid implementation plan for changing the admin maintenance XLSX export so the `Status` column in `Rekap Laporan` uses dashboard-friendly report status labels.

## Context and Sources

- User screenshots showed dashboard status badges using friendly labels while XLSX export showed raw status codes.
- User confirmed the scope is only the maintenance report `Status` column and requested a `writing-plans` output.
- `AI_RULES.md` and `AI_CONTEXT.md` were checked for repo instructions.
- `lib/report-status.ts` defines `getReportStatusLabel()`.
- `app/reports/[reportNumber]/_components/status-badge.tsx` uses `getReportStatusLabel()` for dashboard labels.
- `app/api/admin/export/route.ts` currently writes `textCell(r.status)` in `buildReportSheet()`.

## Changed Files

- `docs/superpowers/plans/2026-09-02-maintenance-export-status-labels.md`: rapid implementation plan with TDD skipped by explicit user request.
- `docs/agent-notes/2026-09-02-1604-maintenance-export-status-labels-plan.md`: required task note for the planning file change.

## Decisions

- Plan keeps filters, queries, and database values as raw status codes.
- Plan maps status codes to friendly labels only in the XLSX builder.
- Plan leaves the PJUM export sheet unchanged because it is outside the confirmed scope.
- Plan skips TDD by explicit user request and uses fast verification instead.

## Verification

- Source context was inspected with `rg` and targeted file reads before writing the plan.
- Placeholder scan against the plan and task note passed with no matches.
- `npm run check:agent-note` could not run because the local `npm` shim points to a missing `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`.
- `node scripts/check-agent-task-note.mjs` could not complete because its internal `git diff --cached` call ran without the repository's `safe.directory` workaround in this environment.

## Remaining Work and Risks

- Implementation and verification remain to be executed from the plan.
- Use direct `node scripts/check-agent-task-note.mjs` or fix the local `npm` shim before relying on npm scripts in this environment.
- The agent-note check may need to be run from a Git environment that recognizes this repo as safe.
