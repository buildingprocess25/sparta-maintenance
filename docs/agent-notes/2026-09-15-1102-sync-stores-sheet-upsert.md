# Sync Stores Sheet Upsert

## Scope

Implemented Task 2 executor/runtime behavior for the store sheet sync cron.
The job now creates missing stores, updates changed sheet-owned fields on
matched stores, returns richer result counts, and reports invalid ownership and
coordinate source values.

Outside scope: deleting, inactivating, resetting, or otherwise mutating stores
that exist only in the database; changing scheduler configuration; running the
sync against production data.

## Context and Sources

- `.superpowers/sdd/task-2-brief.md`
- `AI_RULES.md`
- `docs/agent-notes/2026-09-15-1047-sync-stores-parser-contract.md`
- `docs/agent-notes/2026-09-15-1027-sync-stores-sheet-upsert-plan.md`
- `lib/jobs/sync-stores.ts`
- `scripts/sync-stores-from-sheet.ts`
- `app/api/cron/sync-stores/route.ts`
- `app/api/cron/sync-stores/route.spec.ts`
- `docs/project/07-integrations-and-env.md`
- `prisma/schema.prisma`

## Changed Files

- `lib/jobs/sync-stores.ts`: replaced create-only execution with create/update
  execution using `buildStoreSyncChanges`, added invalid source value counters,
  Prisma Decimal conversion, and ownership enum normalization.
- `scripts/sync-stores-from-sheet.ts`: expanded the CLI success message with
  created, updated, unchanged, skipped, and invalid value counts.
- `app/api/cron/sync-stores/route.spec.ts`: added a source-level assertion that
  the cron route passes through `{ ok: true, ...result }`.
- `docs/project/07-integrations-and-env.md`: documented the active sync cron
  endpoint and its sheet-owned field behavior.
- `docs/agent-notes/2026-09-15-1102-sync-stores-sheet-upsert.md`: this task
  note.
- `.superpowers/sdd/task-2-report.md`: implementation report requested by the
  task brief, including final verification and commit message.

## Decisions

- Followed the Task 2 brief values verbatim.
- Kept existing store `isActive` untouched by only updating sheet-owned fields.
- Left database-only stores untouched; they are counted as skipped by the pure
  change builder.
- Preserved existing coordinates when the sheet coordinate value is invalid or
  empty because `buildStoreSyncChanges` omits coordinate updates in that case.
- Used `asOwnershipType(String(store.ownershipType))` to satisfy TypeScript and
  keep generated enum values inside the local string union.

## Verification

- `node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"`
  passed with `sync-stores-from-sheet tests passed`.
- `node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/api/cron/sync-stores/route.spec.ts')"`
  passed with `sync stores cron route tests passed`.
- `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`
  failed with Node heap out-of-memory.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`
  passed with exit code 0.

## Remaining Work and Risks

None.
