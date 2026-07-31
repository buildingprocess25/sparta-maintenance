# Plan BMC Store Legacy Branch

## Scope

Create the executable implementation plan for the optional BMC **Cabang Lama** store dropdown. No feature code, schema, migration, production query, or production data is changed by this task.

## Context and Sources

- `docs/superpowers/specs/2026-07-31-bmc-store-legacy-branch-design.md`
- `docs/project/06-database.md`
- `app/bmc/database/page.tsx`
- `app/bmc/database/queries.ts`
- `app/bmc/database/actions.ts`
- `app/bmc/database/_components/store-table.tsx`
- `app/bmc/database/_components/store-form-dialog.tsx`

## Changed Files

- `docs/superpowers/plans/2026-07-31-bmc-store-legacy-branch.md`: task-by-task TDD implementation plan.
- `docs/agent-notes/2026-07-31-0851-plan-bmc-store-legacy-branch.md`: planning record.

## Decisions

The plan uses one shared pure helper because server data loading and the client form need the exact same trimming, grouping, sorting, and orphan-value preservation rules. It keeps the existing XLSX import unchanged and requires server validation for every create/update payload.

## Verification

- Reviewed the approved design and current BMC page, query, table, dialog, and action flows.
- Checked the plan against the approved scope: canonical `branchName`, optional `areaName`, no migration, and no automatic data repair.

## Remaining Work and Risks

Implementation has not started. Existing incorrect user branch scopes or store branch values need a separate admin-approved mapping task; they are intentionally not inferred or changed by this plan.

