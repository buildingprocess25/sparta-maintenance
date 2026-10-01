# Refactor Manager Dashboard Lazy Loading

## Scope

Refactor `ManagerDashboard` to use React Suspense and add `prefetch={false}` to tables and panels.

## Context and Sources

Executing the global dashboards lazy loading plan.

## Changed Files

- `app/dashboard/_components/manager-dashboard.tsx`: Extracted data fetching to `ManagerDashboardContent`, wrapped it in `<Suspense>`, and disabled prefetch for internal links.

## Decisions

Reused `AdminDashboardSkeleton` because the manager layout is visually similar to the admin layout (desktop-oriented shell).

## Verification

Will verify through build at the end.

## Remaining Work and Risks

None.
