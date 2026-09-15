# Sync Stores Parser Contract

## Scope

Implemented Task 1 of the sync stores sheet upsert plan: parser and pure
change-builder contract for the existing store sheet sync.

Outside scope: Task 2 executor updates, cron route assertions, integration
documentation updates, and final sync result invalid-value counting.

## Context and Sources

- `.superpowers/sdd/task-1-brief.md`
- `docs/superpowers/plans/2026-09-15-sync-stores-sheet-upsert.md`
- `docs/superpowers/specs/2026-09-04-store-ownership-coordinates-design.md`
- `docs/agent-notes/2026-09-15-1027-sync-stores-sheet-upsert-plan.md`
- `lib/jobs/sync-stores.ts`
- `scripts/sync-stores-from-sheet.ts`
- `scripts/sync-stores-from-sheet.spec.ts`

## Changed Files

- `lib/jobs/sync-stores.ts`: added parser types, ownership parsing,
  coordinate parsing, richer sheet row parsing, pure sync change builder, and a
  Task 1-compatible result type.
- `scripts/sync-stores-from-sheet.ts`: re-exported the new pure helpers for the
  focused parser/change-builder test.
- `scripts/sync-stores-from-sheet.spec.ts`: replaced the create-only assertions
  with the Task 1 parser and change-builder contract test.
- `docs/agent-notes/2026-09-15-1047-sync-stores-parser-contract.md`: this task
  note.

## Decisions

- Followed the Task 1 brief values and test contract verbatim.
- Kept sync execution behavior limited to the previous create-only flow so Task
  2 can implement database updates and richer runtime counts separately.
- Added zero values for the new `SyncStoresResult` fields in the existing
  create-only executor path to keep the exported type shape consistent.

## Verification

- Red test with direct `node_modules\.bin\tsx.cmd scripts\sync-stores-from-sheet.spec.ts`
  was blocked by the known Windows `uv_os_get_passwd returned ENOMEM` wrapper
  failure before test execution.
- Red test with the provided workaround failed as expected because parsed stores
  did not yet include `brand`, `ownershipType`, or coordinates.
- Green test passed with:
  `node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"`

## Remaining Work and Risks

- Task 2 still needs to implement update execution, invalid ownership and
  coordinate counts, cron route result assertion, and integration docs.
- Direct `tsx.cmd` remains unusable in this Windows environment due to the
  documented `uv_os_get_passwd` failure; the workaround command was used for
  focused verification.
