# Store Ownership Coordinates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add store ownership and coordinates to `Store`, prepare the Prisma migration workflow for the user to run manually, and add a Google Sheet enrichment job that updates existing stores by code with auditable mismatch counts.

**Architecture:** Keep brand and ownership separate. Add `StoreOwnershipType` and nullable coordinate fields to Prisma, then implement a focused enrichment parser/job in `lib/jobs/sync-store-enrichment.ts` with a thin CLI wrapper in `scripts/sync-store-enrichment-from-sheet.ts`. The job reuses the existing Google Sheets OAuth pattern and updates only matched stores by normalized `Kode Toko`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Google Sheets API, Node test runner with `tsx`.

## Global Constraints

- `UNKNOWN` is the default ownership value for existing and unmatched stores.
- Do not use `prisma db push`.
- Generate migration files with Prisma migrate, but the user will run migration commands manually.
- The user will run production or staging `prisma migrate deploy`.
- Match rows by normalized store code only.
- Do not create missing stores from the enrichment job.
- Do not commit raw company sheet data, secrets, or production records.
- Reuse `GOOGLE_STORE_SPREADSHEET_ID` and `GOOGLE_STORE_SHEET_RANGE`; local range must include columns `A:E`.

---

### Task 1: Add Parser and Summary Tests

**Files:**
- Create: `lib/jobs/sync-store-enrichment.spec.ts`
- Create: `lib/jobs/sync-store-enrichment.ts`

**Interfaces:**
- Produces: `StoreOwnershipTypeValue`, `parseOwnershipMarker(value)`, `parseCoordinateCell(value)`, `parseStoreEnrichmentSheetRows(rows)`, `buildStoreEnrichmentChanges(sheetStores, dbStores, options)`.

- [ ] Write tests for ownership parsing: `R` returns `REGULAR`, `F` returns `FRANCHISE`, empty and invalid return `UNKNOWN` with warnings.
- [ ] Write tests for coordinate parsing: normal positive values, negative latitude, empty values, malformed values, and out-of-range values.
- [ ] Write tests for sheet parsing: header aliases find `Branch`, `Kode Toko`, `Nama Toko`, `F/R`, and `Titik Koordinat`.
- [ ] Write tests for duplicate handling: identical duplicate rows collapse, conflicting duplicate rows are skipped and counted.
- [ ] Write tests for DB matching: matched stores produce updates, sheet-only rows are counted, DB-only stores become `UNKNOWN` in reset mode, and invalid coordinates do not clear existing coordinates unless `clearInvalidCoordinates` is true.
- [ ] Run `npx tsx lib/jobs/sync-store-enrichment.spec.ts` and confirm it fails because the implementation file does not exist yet.
- [ ] Implement the minimal parser and change builder.
- [ ] Run `npx tsx lib/jobs/sync-store-enrichment.spec.ts` and confirm it passes.

### Task 2: Add Prisma Schema and Migration Instructions

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces Prisma enum `StoreOwnershipType` and `Store` fields `ownershipType`, `latitude`, `longitude`.

- [ ] Add enum `StoreOwnershipType` with `REGULAR`, `FRANCHISE`, and `UNKNOWN`.
- [ ] Add `ownershipType StoreOwnershipType @default(UNKNOWN)`, `latitude Decimal? @db.Decimal(9, 6)`, and `longitude Decimal? @db.Decimal(9, 6)` to `Store`.
- [ ] Do not run `prisma migrate` commands in this session.
- [ ] Document the exact migration commands for the user to run manually.
- [ ] Run `npx prisma generate`.

### Task 3: Add Sheet Sync Job and CLI

**Files:**
- Modify: `lib/jobs/sync-store-enrichment.ts`
- Create: `scripts/sync-store-enrichment-from-sheet.ts`
- Modify: `package.json`
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Produces `syncStoreEnrichmentFromSheet(options?: SyncStoreEnrichmentOptions): Promise<StoreEnrichmentSyncResult>`.
- Produces CLI command `npm run sync:store-enrichment`.

- [ ] Extend the job to fetch Google Sheets rows using `GOOGLE_STORE_SPREADSHEET_ID` and `GOOGLE_STORE_SHEET_RANGE`.
- [ ] Load existing stores with `code`, `ownershipType`, `latitude`, and `longitude`.
- [ ] Update matched stores in transactions or bounded sequential updates.
- [ ] Reset DB-only stores to `UNKNOWN` by default without changing their coordinates.
- [ ] Add `--dry-run` to print audit counts without writing changes.
- [ ] Add `--clear-invalid-coordinates` for intentional coordinate clearing.
- [ ] Add package script `sync:store-enrichment`.
- [ ] Update `.env` local range from `'Sheet 1'!A:C` to `'Sheet 1'!A:E`.
- [ ] Update `.env.example` range from `'Sheet 1'!A:C` to `'Sheet 1'!A:E`.
- [ ] Run the focused test again.

### Task 4: Documentation and Final Verification

**Files:**
- Modify: `docs/project/06-database.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-store-ownership-coordinates.md`

**Interfaces:**
- Produces permanent docs for the new `Store` fields and sync command.

- [ ] Update database docs to mention `Store.ownershipType`, `Store.latitude`, and `Store.longitude`.
- [ ] Create an agent note with changed files, migration status, verification commands, and deployment handoff.
- [ ] Run `npx tsx lib/jobs/sync-store-enrichment.spec.ts`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npx tsc --noEmit --pretty false --incremental false`.
- [ ] Run `git diff --check`.
- [ ] Commit the implementation without running any `prisma migrate` command.
