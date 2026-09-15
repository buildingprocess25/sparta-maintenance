# Task 2 Report: Sync Execution and Cron Result

## Status

DONE

## Summary

Implemented Task 2 for the SPARTA Maintenance store sheet sync. The cron job
now reads sheet rows, compares them against current database stores with the
Task 1 `buildStoreSyncChanges` interface, creates missing stores, updates
changed matched stores, and returns the richer result shape:
`{ rows, created, updated, unchanged, skipped, invalidOwnershipValues, invalidCoordinateValues }`.

## Files Changed

- `lib/jobs/sync-stores.ts`
  - Added invalid ownership and coordinate source counters.
  - Added Prisma Decimal-to-string conversion for comparison.
  - Added ownership enum normalization for generated Prisma values.
  - Replaced the create-only executor with create/update execution based on
    `buildStoreSyncChanges`.
  - Kept existing store `isActive` untouched.
  - Left DB-only stores untouched.
- `scripts/sync-stores-from-sheet.ts`
  - Updated the CLI success message to include rows, created, updated,
    unchanged, skipped, invalid ownership, and invalid coordinate counts.
- `app/api/cron/sync-stores/route.spec.ts`
  - Added the source-level assertion that the route returns
    `NextResponse.json({ ok: true, ...result })`.
- `docs/project/07-integrations-and-env.md`
  - Added `POST /api/cron/sync-stores` to active cron endpoints.
  - Documented the Google Sheet columns, sheet-owned fields, create/update
    behavior, and explicit non-deletion/non-inactivation rule.
- `docs/agent-notes/2026-09-15-1102-sync-stores-sheet-upsert.md`
  - Added the required implementation task note.

## Compatibility Adjustments

No behavioral adjustments were needed. The only TypeScript compatibility detail
was using the brief's `asOwnershipType(String(store.ownershipType))` guard when
mapping Prisma enum values into the local `StoreOwnershipTypeValue` union.

## Verification

Focused tests were run with the required Windows workaround because direct
`node_modules\.bin\tsx.cmd` is known to fail in this environment.

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/sync-stores-from-sheet.spec.ts')"
```

Result:

```text
sync-stores-from-sheet tests passed
```

```powershell
node -e "process.geteuid=()=> 'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/api/cron/sync-stores/route.spec.ts')"
```

Result:

```text
sync stores cron route tests passed
```

The route test also emitted the expected `CRON_SECRET is not configured` error
log while asserting the 500 misconfiguration path.

TypeScript check:

```powershell
node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Result: failed with Node heap out-of-memory.

Retry:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Result: passed with exit code 0.

## Commit

Created with message:

```text
feat: upsert stores from sheet sync
```

## Concerns

None.
