# Store Ownership and Coordinates Design

## Purpose

Enrich SPARTA Maintenance store master data with store ownership type and
coordinates from the company Google Sheet. The goal is to let the system
distinguish regular, franchise, and unknown stores without guessing from store
names or branch names, and to store latitude and longitude for matched stores.

The source sheet currently exposes these columns:

| Sheet column | Meaning |
| --- | --- |
| `Branch` | Branch name from the company store database. |
| `Kode Toko` | Store code used for matching. |
| `Nama Toko` | Store display name in the company store database. |
| `F/R` | Ownership marker: `R` for regular, `F` for franchise. |
| `Titik Koordinat` | Latitude and longitude in one text cell, separated by whitespace. |

## Data Model

Add a dedicated ownership enum to Prisma:

```prisma
enum StoreOwnershipType {
  REGULAR
  FRANCHISE
  UNKNOWN
}
```

Add fields to `Store`:

```prisma
ownershipType StoreOwnershipType @default(UNKNOWN)
latitude      Decimal? @db.Decimal(9, 6)
longitude     Decimal? @db.Decimal(9, 6)
```

`UNKNOWN` is the default because the database has more stores than the source
sheet. A store that is not matched during sync must not be silently classified
as regular.

Coordinates are stored as separate nullable decimal fields so queries, exports,
and future map features can use them directly. `Decimal(9, 6)` is enough for
latitude and longitude values at sub-meter precision while keeping the schema
simple.

## Migration Workflow

Schema changes must be made through Prisma migrations. Do not use
`prisma db push`.

Development workflow:

```powershell
npx prisma migrate dev --name add_store_ownership_and_coordinates
```

Review-first workflow:

```powershell
npx prisma migrate dev --name add_store_ownership_and_coordinates --create-only
npx prisma migrate dev
```

Production or staging deployment:

```powershell
npx prisma migrate deploy
```

The generated migration should add the enum, add the three `Store` columns, and
leave existing rows with `ownershipType = UNKNOWN`. The migration must not
delete or rewrite existing store, report, or brand data.

## Sync Source

Use the existing Google Sheets integration style already present in
`lib/jobs/sync-stores.ts`: OAuth credentials come from environment variables
and the script reads a configured spreadsheet ID and range.

Create a separate enrichment job rather than extending the existing
new-store-only sync. The existing sync creates missing stores, while this new
job updates classification and coordinates for stores that already exist in
SPARTA Maintenance. Keeping the jobs separate avoids changing current store
creation behavior.

Recommended environment variables:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_STORE_DATABASE_SPREADSHEET_ID` | Company store database spreadsheet ID. |
| `GOOGLE_STORE_DATABASE_SHEET_RANGE` | Range containing header and rows. |

If the project owner prefers reusing `GOOGLE_STORE_SPREADSHEET_ID` and
`GOOGLE_STORE_SHEET_RANGE`, the implementation can do so, but the enrichment
job should document which source it expects.

## Matching Rules

Primary matching key is normalized `Kode Toko` to `Store.code`.

Normalization:

- trim whitespace,
- uppercase store code,
- preserve alphanumeric codes such as `1A01`.

Do not match by store name as a fallback. Names can differ between systems and
would create false positives. Branch and name should be used only for audit
messages that help humans inspect mismatches.

Duplicate sheet codes are handled as follows:

- If duplicate rows for the same code have identical normalized ownership and
  coordinates, process one row and count the rest as duplicate-identical.
- If duplicate rows disagree on ownership or coordinates, skip that code and
  record a duplicate-conflict audit entry.

## Parsing Rules

Ownership:

| Sheet value | Stored value |
| --- | --- |
| `R` | `REGULAR` |
| `F` | `FRANCHISE` |
| empty or invalid | `UNKNOWN`, with an audit warning |

Coordinates:

- Expected format is two numeric values in one cell: latitude then longitude.
- Whitespace separates latitude and longitude.
- Commas used as decimal separators may be normalized to dots only when the
  value clearly contains exactly two coordinate numbers.
- Latitude must be between `-90` and `90`.
- Longitude must be between `-180` and `180`.
- Empty or invalid coordinates should leave both coordinate fields `null` and
  record an audit warning.

The sync should update ownership even when coordinates are invalid, as long as
the store code is valid and the ownership value is parseable.

## Update Behavior

For stores matched between sheet and database:

- update `ownershipType`,
- update `latitude` and `longitude` when coordinates parse successfully,
- set both coordinate fields to `null` when the source coordinate cell is empty
  or invalid, only if the run is explicitly allowed to clear coordinates.

The default mode should not clear existing valid coordinates on invalid source
data. This protects previously good data from a temporary sheet issue. A
separate `--clear-invalid-coordinates` flag can be added for intentional
cleanup.

For stores in the database that do not appear in the sheet:

- keep or set `ownershipType = UNKNOWN`,
- leave coordinates unchanged by default,
- include them in the unmatched database-store audit count.

For rows in the sheet whose code does not exist in the database:

- do not create a store,
- include them in the unmatched sheet-row audit count.

## Audit Output

Every run should print a summary that is safe to paste into an agent note or PR:

- sheet rows read,
- valid unique sheet codes,
- stores updated,
- stores unchanged,
- duplicate-identical sheet rows,
- duplicate-conflict sheet codes,
- invalid ownership values,
- invalid coordinate values,
- sheet codes not found in database,
- database stores not found in sheet.

The script may also write a local CSV or JSON audit file under a gitignored
runtime output path if needed, but it must not commit company raw data,
credentials, or production records.

## UI and Reporting Scope

This design only creates the data foundation and sync path. It does not add new
dashboard filters, map views, or export columns yet.

Future UI work can add a store ownership filter with:

| Filter value | Store condition | Label |
| --- | --- | --- |
| `ALL` | no ownership predicate | Semua |
| `REGULAR` | `ownershipType = REGULAR` | Reguler |
| `FRANCHISE` | `ownershipType = FRANCHISE` | Franchise |
| `UNKNOWN` | `ownershipType = UNKNOWN` | Belum diketahui |

Lawson remains sourced from `Store.brand`. Ownership and brand are separate
concepts: a store can have a brand classification and an ownership
classification.

## Access and Safety

Only environments with authorized company Google account credentials can run
the sync. The app should not expose the sheet contents to users who cannot
already access the master source.

The job must avoid logging raw full sheet rows. Logs may include aggregate
counts and store codes needed for audit, but should avoid personal data,
credentials, and unnecessary production records.

## Verification

Unit tests should cover:

- ownership parsing for `R`, `F`, empty, and invalid values,
- coordinate parsing for positive, negative, empty, malformed, and out-of-range
  values,
- duplicate handling,
- match and mismatch summary counts.

Migration verification:

- run `npx prisma migrate dev --name add_store_ownership_and_coordinates`
  against development database, or run with `--create-only` first and inspect
  the SQL,
- run `npx prisma generate`,
- run focused TypeScript and unit tests.

Manual data verification:

- sample one regular store from the sheet and confirm `REGULAR`,
- sample one franchise store from the sheet and confirm `FRANCHISE`,
- sample one database store missing from the sheet and confirm `UNKNOWN`,
- sample one valid coordinate and confirm latitude and longitude are split in
  the right order.

