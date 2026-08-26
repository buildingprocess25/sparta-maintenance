# Match BMS Preventive Coverage Rules

## Scope

- Updated `getBmsPreventiveCoverage` SQL logic to correctly align with how the rest of the application (like `getStoresByBranch`) determines if a store is "Sudah Preventif".

## Decisions

- **Use `createdAt` and remove strict `COMPLETED` check**: Previously, the coverage query strictly required reports to be `COMPLETED` and checked against `finishedAt`. However, the business logic considers a store "prevented" for a quarter as soon as a valid preventive report (all items checked, status not `DRAFT`) is submitted (using `createdAt`). Adjusted the query to use `createdAt` and rely purely on `completePreventiveEvidenceSql` to match the exact same logic used in the "Buat Laporan" page.

## Verification

- The SQL query matches the logic in `getStoresByBranch` ensuring the dashboard and create report page show the exact same coverage status for every store.
