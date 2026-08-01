# Filter ADMIN Maintenance Reports by Brand

## Scope

Added brand filtering logic to the ADMIN dashboard reports list by passing a `brand` argument to `getAdminReports` server action and extending the client-side `AdminReportsTable` UI with a new Select input for Brand.

## Context and Sources

Task 2 of 7 in the Admin Brand Filter Implementation Plan. Uses the shared `StoreBrandFilter` enum and `getReportBrandWhere` query helper created in Task 1.

## Changed Files

- `app/dashboard/reports/actions.ts`: Added `brand` to `AdminReportFilters` and applied `getReportBrandWhere`.
- `app/dashboard/reports/_components/admin-reports-table.tsx`: Added `brand` select filter and passed its value in `loadData`.

## Decisions

- Handled undefined/empty/invalid brand values by falling back to `ALL`.
- Mapped REUI filter options to `STORE_BRAND_OPTIONS`.
- Maintained existing scope semantics for BMC and BNM managers.

## Verification

- `npx eslint app/dashboard/reports/_components/admin-reports-table.tsx` - Passed.
- `npx tsc --noEmit` - Passed.
- Task 1 tests in `lib/store-brand-filter.test.ts` verify the Prisma `where` clause shape.

## Remaining Work and Risks

None
