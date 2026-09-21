# BMC and BNM Manager Dashboard Revamp

## Scope

Revamp the BMC and BNM dashboards to use the newer, cleaner Admin Dashboard layout (Appended option), while restricting data visibility to only branches authorized for the specific manager.

## Context and Sources

- User requested to use the Admin Dashboard UI elements in Manager Dashboards.
- Authorized branches are fetched from the `AuthUser.branchNames` array.
- Implementation plan was based on `docs/superpowers/plans/2026-09-21-bmc-bnm-dashboard-plan.md`.

## Changed Files

- `app/dashboard/queries.ts`: Added optional `branchScope` array filter to all admin data-fetching queries to securely limit results for managers.
- `app/dashboard/page.tsx`: Handled passing down `period` and `brand` context to manager dashboards.
- `app/dashboard/_components/bmc-dashboard.tsx`: Passed down `period` and `brand`.
- `app/dashboard/_components/bnm-dashboard.tsx`: Passed down `period` and `brand`.
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Extracted and exported UI components so they could be reused within the Manager Dashboard layout.
- `app/dashboard/_components/manager-dashboard.tsx`: Completely rebuilt layout using the Admin UI components. Additionally, hid the Branch Performance table per user request for simplicity.

## Decisions

- **Layout Structure:** Reused the modular Admin UI components to preserve the visual identity instead of re-building components from scratch.
- **Data Filtering:** Instead of creating new Manager-specific DB queries that duplicate admin functionality, we refactored existing Admin queries to optionally accept `branchScope`. This minimizes code duplication and leverages existing robust queries.
- **Trend Chart:** Removed the `BranchPerformanceTable` entirely for Managers as it might be overkill since they only manage a small subset of branches.

## Verification

- `npx tsc --noEmit` checks executed successfully after a quick memory configuration fix.
- Full `npm run build` completed to ensure structural and typing correctness.
- The user visually validated the removal of the branch performance table via live dev server.

## Remaining Work and Risks

None
