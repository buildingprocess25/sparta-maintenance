# Realisasi Chart BMS Mode

## Scope

Added BMS (Teknisi) grouping to the Realisasi Chart for Manager Dashboard (BMC/BNM). Admin view remains unchanged (grouped by branch).

## Context and Sources

- `docs/superpowers/plans/2026-09-30-realisasi-chart-bms-mode.md`
- `app/dashboard/queries.ts`
- `app/dashboard/_components/admin/realisasi-chart-widget.tsx`
- `app/dashboard/_components/manager-dashboard.tsx`

## Changed Files

- `app/dashboard/queries.ts`: Added `RealisasiBmsStat` type, `byBMS` array to `AdminRealisasiDetail`, and logic in `getAdminRealisasiDetail` to group realisasi cost by `createdBy.name`.
- `app/dashboard/_components/admin/realisasi-chart-widget.tsx`: Added `mode` prop. If `mode="bms"`, it uses `byBMS` data and displays BMS name on the X-axis and XLSX export.
- `app/dashboard/_components/manager-dashboard.tsx`: Passed `mode="bms"` to the `RealisasiChartWidget`.

## Decisions

- Handled grouping directly in `queries.ts` logic alongside existing aggregations instead of making a new query.
- Re-used `RealisasiChartWidget` with a `mode` prop to keep UI consistent and avoid code duplication.

## Verification

- `npm run dev` running successfully.
- Code inspection confirms that `byBMS` falls back to "Unknown" if `createdBy` is null.

## Remaining Work and Risks

None
