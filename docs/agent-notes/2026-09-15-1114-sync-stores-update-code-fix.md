# Sync Stores Update Code Fix

## Scope

Fixed the Task 2 review finding for store sheet sync update targeting when a
database store code differs only by casing from the normalized sheet code.

## Context and Sources

- `AI_RULES.md`
- `docs/project/07-integrations-and-env.md`
- `docs/agent-notes/2026-09-15-1102-sync-stores-sheet-upsert.md`
- `.superpowers/sdd/task-2-report.md`
- `lib/jobs/sync-stores.ts`
- `scripts/sync-stores-from-sheet.spec.ts`
- `app/api/cron/sync-stores/route.spec.ts`
- `prisma/schema.prisma`

## Changed Files

- `lib/jobs/sync-stores.ts`: updates now use the matched persisted DB store
  code, while the sync executor passes the raw Prisma `store.code` into the
  comparison builder.
- `scripts/sync-stores-from-sheet.spec.ts`: added regression coverage for DB
  code `u005` matched by sheet code `U005`.
- `.superpowers/sdd/task-2-report.md`: appended the review-fix summary and
  verification results.
- `docs/agent-notes/2026-09-15-1114-sync-stores-update-code-fix.md`: this
  task note.

## Decisions

- Kept the existing normalized-code match logic.
- Preserved create behavior by leaving sheet-derived create codes normalized.
- Kept sheet-owned update data unchanged and only changed the update target
  code to the actual persisted primary key.

## Verification

- `node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"`
  passed with `sync-stores-from-sheet tests passed`.
- `node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/api/cron/sync-stores/route.spec.ts')"`
  passed with `sync stores cron route tests passed`.

## Remaining Work and Risks

None.
