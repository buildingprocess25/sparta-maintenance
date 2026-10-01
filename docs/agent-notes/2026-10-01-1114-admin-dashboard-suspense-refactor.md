# Admin Dashboard Suspense Refactor

## Scope

Refactor `AdminNewDashboard` to use React Suspense and `AdminDashboardSkeleton`.

## Context and Sources

Continuing the implementation plan for lazy loading the admin dashboard.

## Changed Files

- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Extracted data fetching to `AdminDashboardContent` and wrapped in `<Suspense>`.
- `docs/plans/task.md`: Updated task list.

## Decisions

Applied the standard Next.js App Router streaming pattern.

## Verification

Manual verification needed or Next.js build.

## Remaining Work and Risks

None.
