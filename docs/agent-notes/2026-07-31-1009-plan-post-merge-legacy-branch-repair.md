# Plan Post-Merge Legacy Branch Repair

## Scope

Create the executable implementation plan for repairing post-merge legacy branch records and preventing new BMC store writes/imports from using legacy branch names. No code or production data changes are made in this task.

## Context and Sources

- `docs/superpowers/specs/2026-07-31-post-merge-legacy-branch-repair-design.md`
- `scripts/merge-branch-scopes.ts`
- `app/bmc/database/actions.ts`
- `app/bmc/database/_components/store-table.tsx`
- `app/bmc/database/_components/store-form-dialog.tsx`
- `app/bmc/database/_components/import-store-dialog.tsx`

## Changed Files

- `docs/superpowers/plans/2026-07-31-post-merge-legacy-branch-repair.md`: TDD implementation plan.
- `docs/agent-notes/2026-07-31-1009-plan-post-merge-legacy-branch-repair.md`: planning record.

## Decisions

The repair mode is a separate explicit command so the original merge remains unchanged. It uses the old branch value only as the fallback area for post-merge rows that do not already have an area.

The BMC application rejects legacy writes instead of mapping them automatically, including import targets. This prevents recurrence while keeping stale user scopes from silently broadening authorization.

## Verification

- Reviewed the approved repair specification, existing BMC create/update/import flow, and current merge script.
- Confirmed the plan keeps production repair behind an explicit dry-run and execute boundary.

## Remaining Work and Risks

Implementation and all production commands remain pending. The repair execute command must not run until the user separately approves it after dry-run results are reviewed.
