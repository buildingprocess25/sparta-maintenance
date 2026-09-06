# Store ownership and coordinates implementation

## Scope

Added schema, parser, sync job, CLI, environment range, and documentation for
enriching stores with ownership type and coordinates from the company Google
Sheet. Migration commands were intentionally not run because the user asked to
run migrate manually.

## Context and Sources

- `docs/superpowers/specs/2026-09-04-store-ownership-coordinates-design.md`
- `docs/superpowers/plans/2026-09-04-store-ownership-coordinates.md`
- `prisma/schema.prisma`
- `lib/jobs/sync-stores.ts`
- User confirmed unmatched stores should become `UNKNOWN`.
- User confirmed migration commands should be provided as copy-paste tutorial
  and run manually by the user.

## Changed Files

- `prisma/schema.prisma`: added `StoreOwnershipType`,
  `Store.ownershipType`, `Store.latitude`, and `Store.longitude`.
- `lib/jobs/sync-store-enrichment.ts`: added sheet parsing, ownership and
  coordinate parsing, matching/change summary, and Google Sheet sync job.
- `lib/jobs/sync-store-enrichment.spec.ts`: added focused tests for parser,
  duplicate handling, and DB matching behavior.
- `scripts/sync-store-enrichment-from-sheet.ts`: added CLI wrapper with
  `--dry-run` and `--clear-invalid-coordinates` flags.
- `package.json`: added `sync:store-enrichment` script.
- `.env`: updated the local store sheet range/comment to include columns A:E.
- `.env.example`: updated the documented store sheet range to A:E.
- `docs/project/06-database.md`: documented store enrichment fields, sync
  command, range requirement, and manual migration commands.
- `docs/superpowers/plans/2026-09-04-store-ownership-coordinates.md`: recorded
  implementation plan and manual migration handoff.
- `docs/agent-notes/2026-09-04-1749-store-ownership-coordinates.md`: this task
  note.

## Decisions

- Keep `Store.brand` for Lawson/Alfamart and add separate ownership fields for
  regular/franchise/unknown.
- Use `UNKNOWN` as the default ownership value.
- Match enrichment rows by normalized `Kode Toko` only.
- Do not create stores from the enrichment job when a sheet code is missing in
  the SPARTA Maintenance database.
- Preserve existing coordinates by default when source coordinates are invalid;
  clearing invalid coordinates requires `--clear-invalid-coordinates`.
- Do not run `prisma migrate` in this task; the user will generate/apply the
  migration manually.

## Verification

- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/jobs/sync-store-enrichment.spec.ts")'`
  passed: `sync-store-enrichment tests passed`.
- `.\node_modules\.bin\prisma.cmd validate` passed: schema is valid.
- `.\node_modules\.bin\prisma.cmd generate` passed and regenerated Prisma
  Client from the updated schema.
- `git -c safe.directory=D:/MAGANG-ALFA/sparta-maintenance diff --check`
  passed before this note was created.
- `.\node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`
  failed with Node heap out-of-memory at the default heap size.
- Retried TypeScript with `NODE_OPTIONS=--max-old-space-size=4096`; it produced
  no errors but did not finish after several minutes and was interrupted.
- Focused ESLint on the new sync files produced no errors but did not finish
  after more than 60 seconds and was interrupted.

## Remaining Work and Risks

- User still needs to run the manual Prisma migration command and inspect/commit
  the generated migration file.
- After the migration is applied to the intended development database, run
  `npm run sync:store-enrichment -- --dry-run` before running the real sync.
- Full TypeScript and focused ESLint should be retried in an environment where
  the checks complete.

