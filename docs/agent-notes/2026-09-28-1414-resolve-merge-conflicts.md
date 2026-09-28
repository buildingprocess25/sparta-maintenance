# Resolve Merge Conflicts (main into feature/admin-dashboard-v2)

## Scope

Resolving merge conflicts that occurred when merging the `main` branch into `feature/admin-dashboard-v2`. The conflicts were specifically in `app/dashboard/queries.ts`. Included fixing subsequent type errors caused by the merge.

## Context and Sources

The `main` branch recently received a major performance optimization for `getUserStats`, `getBMCStats`, and `getBNMStats` (using `groupBy` instead of `Promise.all`), as well as wrapping `getAdminBranchHierarchy` with `unstable_cache`. The feature branch added several new data points for the Admin Command Center. The merge conflict was resolved by keeping the optimized logic from `main` while retaining the new features from the feature branch.

## Changed Files

- `app/dashboard/queries.ts`: Resolved merge conflicts by keeping optimized `groupBy` stats and `unstable_cache` wrappers. Kept new Admin data points untouched. Added explicit type for `chunk`.
- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Fixed import path for `queries.ts` and updated `User` to `AuthUser`.
- `app/dashboard/_components/admin/kpi-cards.tsx`: Fixed import path for `queries.ts`.
- `app/dashboard/_components/admin/status-distribution.tsx`: Fixed import path for `queries.ts`.
- `lib/pdf/generate-pjum-form-pdf-qr.spec.ts`: Removed invalid `s` flag from regex.

## Decisions

- Retained the `main` branch logic for all conflict markers to ensure the DB pool optimization remains intact.
- Used `AuthUser` instead of Prisma `User` in `AdminDashboardV2Props` to align with changes made to `requireAuth()` in the `main` branch.

## Verification

- `npx prettier --write app/dashboard/queries.ts` to unify formatting (2 spaces).
- `tsc --noEmit` with increased memory limit passed without any errors.

## Remaining Work and Risks

None.
