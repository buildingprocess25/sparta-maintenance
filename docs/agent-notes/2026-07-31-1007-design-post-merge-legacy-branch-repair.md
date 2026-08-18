# Design Post-Merge Legacy Branch Repair

## Scope

Document the approved design for repairing legacy branch values entered after the original branch merge and preventing new BMC store writes from using legacy branches. No code, database query, migration, or production data is changed in this task.

## Context and Sources

- `scripts/merge-branch-scopes.ts`
- `app/bmc/database/actions.ts`
- `app/bmc/database/_components/store-form-dialog.tsx`
- `app/bmc/database/_components/import-store-dialog.tsx`
- `docs/project/06-database.md`
- `docs/project/08-operations.md`
- `docs/superpowers/specs/2026-07-31-bmc-store-legacy-branch-design.md`

## Changed Files

- `docs/superpowers/specs/2026-07-31-post-merge-legacy-branch-repair-design.md`: approved repair and prevention design.
- `docs/agent-notes/2026-07-31-1007-design-post-merge-legacy-branch-repair.md`: task record.

## Decisions

The post-merge repair is explicit and uses the already approved branch map. It assigns the old branch label as an area only when the affected Store or Report has no area, preserving any more specific existing area.

Application writes reject legacy branches rather than silently remapping them. This makes the user choose the canonical branch plus Cabang Lama and avoids granting canonical-branch write access to stale user scopes.

## Verification

- Reviewed the current branch merge script and BMC store import flow.
- Confirmed the original script maps users, stores, reports, and PJUM, while post-merge entries need a separate bounded repair mode.
- No data operation was run.

## Remaining Work and Risks

User review of the written specification is required before creating an implementation plan. Production repair will require a dry run, backup, and separate explicit approval for the execute flag.
