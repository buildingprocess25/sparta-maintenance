# Design BMC Store Legacy Branch

## Scope

Document the approved design for an optional BMC store field labelled **Cabang Lama**. The field records `Store.areaName` as a legacy area dependent on the selected canonical `branchName`. No application behavior, schema, migration, or database data is changed in this task.

## Context and Sources

- `docs/project/06-database.md`
- `app/bmc/database/page.tsx`
- `app/bmc/database/queries.ts`
- `app/bmc/database/actions.ts`
- `app/bmc/database/_components/store-table.tsx`
- `app/bmc/database/_components/store-form-dialog.tsx`
- Existing BMC Store import flow.

## Changed Files

- `docs/superpowers/specs/2026-07-31-bmc-store-legacy-branch-design.md`: approved design and boundary for the future implementation.
- `docs/agent-notes/2026-07-31-0846-design-bmc-store-legacy-branch.md`: task record.

## Decisions

The UI label is **Cabang Lama**. It is an optional, branch-dependent dropdown sourced from existing non-empty `Store.areaName` values. It is hidden when the selected canonical branch has no values.

The canonical branch remains `Store.branchName`. Server actions must validate that a submitted legacy value belongs to the authorized canonical branch. Existing user scope cleanup and historical data mapping are separate, explicit work because the application cannot safely infer those mappings.

## Verification

- Reviewed the current Store create, update, list, and import code.
- Reviewed the canonical branch and area contract in `docs/project/06-database.md`.
- No code, schema, migration, import behavior, or production data changed.

## Remaining Work and Risks

User review of the written specification is required before creating the implementation plan. The separate mapping of legacy scopes and historical records remains deferred.
