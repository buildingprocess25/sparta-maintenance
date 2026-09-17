# Fix Preventive Status Query Mismatch

## Scope

Fixes a discrepancy between the Coverage page and the Create Report page regarding a store's preventive maintenance status. Changing how reports are fetched for the store selection step in report creation.

## Context and Sources

- Discrepancy observed: Store "Y376" showed as "Sudah Preventif" in coverage but "Belum Preventif" during report creation.
- Root cause: Store migrated branches (MALANG -> JEMBER). The report was recorded with `branchName = 'MALANG'`.
- Coverage correctly uses relational join on `Store` table, so it respects the Store's current branch.
- Create Report incorrectly filtered reports by `branchName`, thus hiding the report.

## Changed Files

- `app/reports/actions/queries.ts`: Changed `branchName` to `store: { branchName }` in `getStoresByBranch`.
- `next.config.ts`: Added optimizePackageImports to speed up Turbopack compilation.

## Decisions

Used Prisma's relation filter `store: { branchName }` instead of an `IN` clause with a potentially large array of `storeCode`s to match the exact same logic as the Coverage page query and ensure optimal performance.

## Verification

Manually queried the database via scripts to verify that the report existed under a different branch name, confirming the hypothesis. 

## Remaining Work and Risks

None.
