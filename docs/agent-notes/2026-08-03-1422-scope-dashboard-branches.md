# Scope the dashboard realisasi and performance branches

## Scope

Filter branches in the Admin Dashboard (Performance and Trends) based on the selected brand.
Outside scope: production data update, database migration.

## Context and Sources

- Task 2 from Brand-Owned Branches Implementation Plan.
- Use `getStoreBrandWhere` to retrieve owned branch names.
- `app/dashboard/queries.ts` is updated to inject the visible branch names.

## Changed Files

- `app/dashboard/queries.ts`: Add `getBrandOwnedBranchNames` and filter branch accumulations in `getAdminBranchPerformance` and `getAdminBranchTrend`. Update `AdminCommandCenterDataBreakdown` to include `branches` and `trends`.

## Decisions

- Alfamart and Lawson branches are individually calculated and supplied to `brandBreakdown` when `ALL` brand is selected.
- Updated `AdminCommandCenterDataBreakdown` typing to allow storing `branches` and `trends` for brand breakdown.

## Verification

- `npx eslint app/dashboard/queries.ts lib/store-brand-filter.ts lib/store-brand-filter.test.ts` passed (GREEN).
- `npx tsc --noEmit` passed (GREEN).
- `npx jest lib/store-brand-filter.test.ts` triggered and verified.

## Remaining Work and Risks

None.
