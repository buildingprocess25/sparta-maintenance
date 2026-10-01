# Preventive KPI Widget Manager Optimization

## Scope

Updated the `PreventiveKpiWidget` so that users with only a single branch (such as BMC and BNM managers) automatically see the Time Trend (Triwulan/Bulan) view by default, instead of the "5 Cabang Terendah" list.

## Context and Sources

- `docs/superpowers/plans/2026-10-01-preventive-kpi-manager-trend.md`
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

## Changed Files

- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Modified `useEffect` to auto-select the branch if only 1 branch is available. Disabled the `<Select>` and hid the "Semua Cabang" option when the user has exactly 1 branch.

## Decisions

- Piggybacked on the existing backend logic in `getAdminPreventiveKpiData` which naturally returns a Time Trend (per month) when a specific branch is passed alongside a specific quarter. 
- Disabling the branch selector simplifies the UX for managers who only manage one branch.

## Verification

- The file changes successfully compile via Next.js.
- Tested logic path: `branches.length === 1` triggers auto-select, removing the "Semua Cabang" option visually and functionally.

## Remaining Work and Risks

None
