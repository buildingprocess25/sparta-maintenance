# Restrict Deleted Reports History to Admin

## Scope

Restrict the "History Dihapus" tab on the "Laporan Maintenance" page to only be visible for the Admin role. For BMC and BNM roles, only the active reports table is shown.

## Context and Sources

- User requested to hide the "Laporan Aktif" and "History Dihapus" tabs for BMC and BNM dashboards, as the deletion action is only available to Admin.

## Changed Files

- `app/dashboard/reports/page.tsx`: Conditionally render `Tabs` containing "History Dihapus" only if the user is `isAdmin`. Otherwise, directly render the `AdminReportsTable`.

## Decisions

- Created a variable `activeReportsTable` to hold the JSX for `AdminReportsTable` so it can be reused in both the `TabsContent` (for admin) and a plain `div` (for non-admin).

## Verification

- Built using `npm run build:memory`.

## Remaining Work and Risks

None.
