# Design Spec: Dashboard Currency Formatting

## 1. Goal
Remove the generic "Jt" and "M" compact formatting for monetary values on the dashboard overview cards so they display as full nominal values (e.g., `Rp 3.000.000`), as requested by users. However, retain compact decimal formatting explicitly for values reaching Trillions (e.g., `Rp 2,541 T`). Keep chart Y-axes using the original compact notation to prevent layout overlap.

## 2. Approach
- **Create a specialized formatter**: We will add `formatDashboardCurrency(value: number)` inside `lib/utils.ts`.
- **Formatting Rules**:
  - If `Math.abs(value) >= 1_000_000_000_000` (1 Triliun): Divide by 1T and format with up to 3 decimal places + " T" suffix (e.g., `Rp 2,541 T`).
  - If `Math.abs(value) < 1_000_000_000_000`: Format as standard full currency without abbreviations (e.g., `Rp 3.000.000.000`).
- **Target Locations (Dashboard Cards)**:
  - `app/dashboard/_components/admin/admin-new-dashboard.tsx`
  - `app/dashboard/realisasi/_components/realisasi-content.tsx`
  - `app/dashboard/branches/[branchName]/page.tsx`
  - `app/dashboard/branches/_components/admin-branches-table.tsx`
  - `app/dashboard/bms-performance/page.tsx`
- **Exclusions (Charts)**:
  - `realisasi-charts.tsx`, `bms-performance-chart.tsx`, `admin-overview-charts.tsx`, etc., will remain untouched.

## 3. Rationale & Trade-offs
- Using a centralized function `formatDashboardCurrency` makes future adjustments trivial.
- Leaving `Recharts` using native `Intl.NumberFormat(..., { notation: "compact" })` guarantees the charts won't visually break when rendering billions/millions.

## 4. Verification Plan
- Deploy locally and verify the summary cards (Ringkasan Operasional, Realisasi) now show full numbers (e.g., Rp 5.000.000).
- Check the charts to ensure their axes remain compact (Jt/M).
