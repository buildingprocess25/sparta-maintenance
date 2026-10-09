# Daily Sync BMS Coverage Implementation

## Scope

Implemented `Daily Sync BMS Coverage` feature to automatically synchronize BMS store assignments (`BmsStoreAssignment`) from a multi-sheet Google Spreadsheet to database production with informative logging.

- **In Scope:**
  - Multi-sheet discovery via Google Sheets API v4 (`sheets.spreadsheets.get`).
  - Core job parser (`lib/jobs/sync-bms-coverage.ts`).
  - Cron API endpoint (`app/api/cron/sync-bms-coverage/route.ts`).
  - CLI execution script (`scripts/sync-bms-coverage-from-sheet.ts`).
  - Environment variable `GOOGLE_BMS_COVERAGE_SPREADSHEET_ID` in `.env.example`.
- **Out of Scope:**
  - Modifications to store master sync (`sync-stores`).

## Context and Sources

- `lib/jobs/sync-stores.ts`
- `app/api/cron/sync-stores/route.ts`
- User spec & screenshot: Multi-sheet tab per branch (`BANDUNG`, `TEGAL`, etc.) with headers `KODE TOKO`, `NIK BMS`, `NAMA BMS`.

## Changed Files

- `lib/jobs/sync-bms-coverage.ts`: Core parser, sheet discovery, DB diff comparison, transaction execution, and log summary builder.
- `app/api/cron/sync-bms-coverage/route.ts`: Cron API endpoint protected by `CRON_SECRET`.
- `scripts/sync-bms-coverage-from-sheet.ts`: CLI script for manual execution and dry runs.
- `.env.example`: Added `GOOGLE_BMS_COVERAGE_SPREADSHEET_ID`.
- `docs/plans/task.md`: Updated live task tracker status.

## Decisions

- Dynamically list all sheet titles using `sheets.spreadsheets.get` so adding/renaming branch tabs in spreadsheet works seamlessly.
- Match stores primarily by `KODE TOKO` (case-insensitive primary key) to avoid branch name formatting mismatches (e.g. `CILEUNGSI 2` vs `CILEUNGSI`).
- Safely skip store codes that do not exist in `prisma.store` master data and return them in `skippedMissingStores` log array.
- Perform assignment mutations (deactivating old BMS, creating new BMS) atomically inside Prisma `$transaction`.

## Verification

- `npx tsc --noEmit` check passed with exit code 0.

## Remaining Work and Risks

- Set `GOOGLE_BMS_COVERAGE_SPREADSHEET_ID` in production `.env`.
- Configure scheduled task in Dokploy dashboard for `POST /api/cron/sync-bms-coverage` with `Authorization: Bearer <CRON_SECRET>`.
