# Sync Stores Sheet Upsert Plan

## Scope

Wrote an implementation plan for improving the existing Dokploy-backed
`/api/cron/sync-stores` scheduler so sheet rows create or update Alfamart store
fields by code while leaving database-only stores untouched.

Outside scope: implementing code changes, running production sync, or changing
Dokploy scheduler configuration.

## Context and Sources

- User clarified the target is the existing Dokploy scheduler endpoint, not the
  separate `sync-store-enrichment` CLI job.
- User provided the live sheet columns: `Branch`, `Kode Toko`, `Nama Toko`,
  `F/R`, and `Titik Koordinat`.
- `app/api/cron/sync-stores/route.ts`
- `lib/jobs/sync-stores.ts`
- `scripts/sync-stores-from-sheet.ts`
- `scripts/sync-stores-from-sheet.spec.ts`
- `docs/project/07-integrations-and-env.md`

## Changed Files

- `docs/superpowers/plans/2026-09-15-sync-stores-sheet-upsert.md`: new
  task-by-task implementation plan.
- `docs/agent-notes/2026-09-15-1027-sync-stores-sheet-upsert-plan.md`: this
  task note.

## Decisions

- Keep the same cron endpoint and authorization contract.
- Change planned behavior from create-only to sync-by-code for sheet rows.
- Only update existing stores when sheet-owned fields differ.
- Do not touch `isActive` for existing stores.
- Do not delete, inactivate, reset, or otherwise modify stores absent from the
  sheet.
- Treat sheet rows as Alfamart by setting `brand = ALFAMART`.
- Preserve existing coordinates when the sheet coordinate cell is empty or
  invalid.

## Verification

- Read the `writing-plans` skill before writing the plan.
- Checked current sync route, sync job, CLI wrapper, tests, Prisma Store model,
  and integration documentation before drafting tasks.
- No code tests were run because this task only writes the implementation plan.

## Remaining Work and Risks

- Execute the plan in a follow-up implementation task.
- During implementation, verify TypeScript behavior around Prisma Decimal and
  enum values against the generated client.
