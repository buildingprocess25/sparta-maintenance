# Design Spec: Sync Active Reports KPI

## Context
Currently, the "Laporan Aktif" metric in the top KPI card counts all active reports (126), regardless of their SLA status. However, the "Distribusi Status & SLA" widget filters out reports that do not have an SLA (10 reports), resulting in a mismatched large number (116). Furthermore, the brand breakdown under the SLA widget pulls from the global KPI metric (Alfamart: 125, Lawson: 2), which sums to 127 and creates a confusing UX.

The goal is to synchronize these numbers so that the SLA widget displays all 126 active reports, showing those without an SLA clearly in the table.

## Approach
- **Include Non-SLA Statuses:** Remove the `item.slaDays !== null` filter in `status-distribution.tsx`.
- **UI Update for Non-SLA:** For statuses without an SLA (e.g. `item.slaDays === null`), the "Kondisi SLA" column in the table will display a gray/slate badge reading "Tanpa batas waktu".
- **Progress Bar Alignment:** The progress bar will map the full 100% to all active reports (including those without an SLA). Non-SLA statuses will still use the existing status segment colors.
- **Investigate the 127 vs 126 discrepancy:** There is a 1-report difference between total active reports (126) and Alfamart + Lawson (127). The implementation plan will include a step to trace this in `queries.ts` and correct the query filtering for the brand breakdown if necessary (e.g., handling reports without a brand properly, or fixing a duplicate count).

## Architecture & Components
- **`app/dashboard/_components/admin/status-distribution.tsx`**: Modify the `visibleStatus` logic. Update the `Badge` rendering inside the table loop and footer to account for `item.slaDays === null`.
- **`app/dashboard/queries.ts` (Optional/Bugfix)**: Investigate why `brandBreakdown` sums to 127 while global is 126. If the discrepancy is due to a query logic bug, apply a fix to `getAdminKpiMetric` or how `brandBreakdown` is assembled in `getAdminCommandCenterData`.

## Out of Scope
- Modifying the underlying database schema.
- Changing how SLA is calculated (we only change how non-SLA is displayed).
