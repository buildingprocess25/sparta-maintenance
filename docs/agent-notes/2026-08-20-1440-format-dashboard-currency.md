# Format Dashboard Currency

## Scope

Added `formatDashboardCurrency` utility to format monetary values on the dashboard so that values under 1 Trillion are fully written out (e.g., Rp 3.000.000) while values 1 Trillion and above use compact notation (e.g., Rp 2,541 T).

## Context and Sources

Requested by the user via `/brainstorming` to replace generic `Intl.NumberFormat` compact notation ("Rp 3 M") with full values in dashboard cards, while retaining Trillion compaction.

## Changed Files

- `lib/utils.ts`: Added `formatDashboardCurrency` function.
- `lib/utils.spec.ts`: Added unit tests for the formatter.
- `app/dashboard/_components/manager-dashboard.tsx`: Replaced compact formatting.
- `app/dashboard/realisasi/_components/realisasi-content.tsx`: Replaced compact formatting.
- `app/dashboard/branches/_components/admin-branches-table.tsx`: Replaced compact formatting.
- `app/dashboard/branches/[branchName]/page.tsx`: Replaced compact formatting.
- `app/dashboard/bms-performance/page.tsx`: Replaced compact formatting.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Replaced compact formatting.

## Decisions

- Created a central formatter to standardize dashboard currency logic.
- Avoided changing chart axes formatters to prevent UI layout overlaps.

## Verification

Unit tests written in `lib/utils.spec.ts` passing.

## Remaining Work and Risks

None.
