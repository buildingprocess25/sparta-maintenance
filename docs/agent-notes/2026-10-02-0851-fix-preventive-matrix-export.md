# Fix Preventive Matrix Export Discrepancy

## Scope

Adding the `isActive: true` filter to the store query in `annual-matrix-export.ts` so that it matches the behavior of the dashboard query, ignoring inactive stores in the export.

## Context and Sources

- `app/dashboard/preventive/actions.ts`: Used for the dashboard view, contains `isActive: true` filter.
- `app/dashboard/preventive/annual-matrix-export.ts`: Used for exporting the matrix, was missing the `isActive: true` filter.

## Changed Files

- `app/dashboard/preventive/annual-matrix-export.ts`: Added `isActive: true` to the `Prisma.StoreWhereInput` object in `getPreventiveMatrixExportData`.

## Decisions

The discrepancy arose because the dashboard view ignored inactive stores while the export included them. The business logic implies inactive stores should not be counted towards targets or checklist completion rates. Adding the filter to the export function aligns both data sources.

## Verification

Manually reviewed the query construction in both files.

## Remaining Work and Risks

None.
