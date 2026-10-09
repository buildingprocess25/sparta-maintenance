# Sync BMS Coverage Script Improvements

## Scope

Improved the `sync-bms-coverage-from-sheet` script to read native `.xlsx` files from Google Drive directly without conversion, and added a Smart Resolver (Fuzzy Matcher) to handle NIK typos by falling back to Exact Name or Fuzzy Name matching. Also added a persistent `--dry-run` flag.

## Context and Sources

- `lib/jobs/sync-bms-coverage.ts`
- `scripts/sync-bms-coverage-from-sheet.ts`

## Changed Files

- `lib/jobs/sync-bms-coverage.ts`: Replaced `google.sheets` API with `google.drive` + `xlsx` to parse `.xlsx` files directly. Added `BmsUserResolver` class to handle NIK typos. Updated return type to include `resolvedByName`, `resolvedByFuzzy`, and `resolvedLogs`.
- `scripts/sync-bms-coverage-from-sheet.ts`: Added `--dry-run` argument parsing. Updated `console.log` output to display audit logs for name/fuzzy resolution.

## Decisions

- **Google Drive API + SheetJS**: Chosen because Google Sheets API v4 doesn't support reading non-Google Sheets files (e.g. uploaded Excel files). This avoids forcing the admin to convert files manually.
- **BmsUserResolver**: Added a 3-layer check (Exact NIK -> Exact Name -> Fuzzy First 2-3 Words) to tolerate human errors (typos in NIK) in the spreadsheet, preventing foreign key constraints errors and unnecessary updates.

## Verification

- Dry run executed successfully with output showing 465 stores resolved by Exact Name Match that would have otherwise errored.
- Verified that missing/invalid NIKs and unresolvable names correctly skipped.

## Remaining Work and Risks

None.
