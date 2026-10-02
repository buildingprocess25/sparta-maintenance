# Fix Admin Dashboard Full-Page Skeleton

## Scope

Move the `AdminDashboardShell` component outside of the Suspense boundary in the admin dashboard route so that the sidebar and navbar render immediately while the dashboard data is being fetched.

## Context and Sources

- `app/dashboard/page.tsx`
- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`
- The user reported that the dashboard skeleton covered the entire page (including the sidebar) while loading data.

## Changed Files

- `app/dashboard/page.tsx`: Wrapped the `Suspense` boundary inside `AdminDashboardShell` so the shell renders synchronously.
- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Removed the `AdminDashboardShell` wrapper since it is now provided by the parent page component.

## Decisions

By placing `AdminDashboardShell` in `page.tsx`, the skeleton (`AdminDashboardSkeleton`) will now only replace the inner `AdminDashboardContent`, leaving the sidebar and top navigation intact during asynchronous data fetching.

## Verification

- `npm run build:memory` completed successfully without errors.
- Confirmed layout hierarchy correctly isolates the Suspense boundary to the content area.

## Remaining Work and Risks

None
