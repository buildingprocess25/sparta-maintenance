# Admin Dashboard Lazy Loading

## Scope

Implement React Suspense for the Admin Dashboard to unblock initial render while data fetches.

## Context and Sources

User requested optimization of `getAdminCommandCenterData` fetching time.

## Changed Files

- `app/dashboard/_components/admin/admin-dashboard-skeleton.tsx`: Created skeleton component.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Refactored to wrap content in `<Suspense>`.

## Decisions

Use React Suspense to lazily load the heavy KPI components instead of client-side data fetching.

## Verification

Will build the app locally to ensure the page renders correctly.

## Remaining Work and Risks

None.
