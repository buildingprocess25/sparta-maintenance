# Manager Dashboard Redesign

## Scope

Reordered widgets in the BMC and BNM dashboards to place Priority and PJUM widgets higher, and added a Realisasi Chart scoped to the user's branch.

## Context and Sources

- `app/dashboard/_components/manager-dashboard.tsx`
- User requests to redesign the layout.

## Changed Files

- `app/dashboard/_components/manager-dashboard.tsx`: reordered JSX elements, imported and rendered RealisasiChartWidget, and updated queries to fetch `realisasiData`.

## Decisions

- The Realisasi chart is placed at the bottom, just above the recent activity, as requested by the user.

## Verification

- Verified `realisasiData` passes `user.branchNames` to correctly scope data for BMC/BNM users.

## Remaining Work and Risks

None
