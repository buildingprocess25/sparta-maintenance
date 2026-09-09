# Fix Filter Persistence Bugs

## Scope

Fix filter persistence issues in Reports and Preventive pages where filters are lost or inconsistently applied on page back.
- Reports: Persist `fromDate` and `toDate` filters.
- Preventive: Fix `brand` filter and `completion` status on initial data fetch.

## Context and Sources

- `docs/superpowers/plans/2026-09-09-fix-filter-persistence.md`
- `app/dashboard/reports/page.tsx`
- `app/dashboard/reports/_components/admin-reports-table.tsx`
- `app/dashboard/preventive/page.tsx`

## Changed Files

- `app/dashboard/reports/page.tsx`: Added `fromDate` and `toDate` to searchParams and passed them to `getAdminReports` and `AdminReportsTable`.
- `app/dashboard/reports/_components/admin-reports-table.tsx`: Updated `pushFilterToUrl` and initial state to handle `fromDate` and `toDate`.
- `app/dashboard/preventive/page.tsx`: Fixed `getAdminPreventive` initial fetch to pass `brand` and calculate `completion` dynamically.

## Decisions

- Handled date filters the same way as other text filters in Reports.
- Reused `getPreventiveCompletionForTab` in Server Component to correctly initialize data fetch for Preventive page instead of hardcoding "completed".

## Verification

Manual verification steps for Reports and Preventive. Code changes verified visually.

## Remaining Work and Risks

None.
