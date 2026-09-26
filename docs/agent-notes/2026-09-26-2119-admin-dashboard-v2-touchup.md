# Admin Dashboard V2 UI Enhancements and Chart Fixes

## Scope

Refine the UI/UX of the Admin Dashboard V2 components, specifically fixing the Dana Taktis chart rendering and updating the footer stats cards to match the design language of the top KPI cards. Irrelevant scratch files and test files were ignored/deleted.

## Context and Sources

- User feedback on chart alignments and coloring.
- Dashboard V1 UI reference (kpi-cards.tsx).

## Changed Files

- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Refactored LineChart to ComposedChart, fixed vertical alignment, added Shadcn tooltip, and touched up footer stats UI (added Alfamart/Lawson breakdown with matched colors).
- `app/dashboard/queries.ts`: Updated `getAdminRealisasiDetail` logic to ignore reports with realization < 1000 IDR for the average calculation.
- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`, `process-duration-widget.tsx`, `status-distribution.tsx`: Added new dashboard widgets as requested in earlier steps.
- Removed various temporary `scratch_*.ts` and `test.js` files.

## Decisions

- **Dana Taktis Chart**: Replaced stacked lines with a Bar (Volume) and Line (Average) ComposedChart to visually distinguish the metrics. Sorted the X-axis alphabetically to match V1.
- **Footer Stats UI**: Converted to Flexbox layout for perfect centering and explicitly removed abbreviations ("Alf" -> "Alfamart") to maintain terminology consistency with the rest of the application.
- **Realisasi Average Logic**: Filtered out `totalReal` values < 1000 before computing the average so that 0-value reports do not drag down the average unfairly, while keeping them in the volume count.

## Verification

- Visual verification via Next.js dev server.
- Verified that hovering the chart shows properly formatted numbers.
- Checked git status to ensure only relevant files are staged.

## Remaining Work and Risks

None.
