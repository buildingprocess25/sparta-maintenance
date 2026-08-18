# Brainstorming: Material Analysis Enhancements

## Context
User requests three UI/UX improvements to the Material Analysis tab:
1. **Export Dialog**: Instead of downloading directly based on the table's current view, the export button should open a popup with filter inputs tailored for Material Analysis.
2. **Clickable Report Numbers**: The report number column should be clickable links to the report details, matching the style from the Laporan Maintenance tab.
3. **Table Styling**: Reduce the table text size and padding to match the Laporan Maintenance tab for better data density.

## Questions for the User
To proceed with the best design, I need to clarify:
1. Should the Export popup's filters be pre-filled with the table's current filters, or should it start fresh (independently) every time it's opened?
2. The current table has a client-side search box (Cari item, material, toko...). Should this search box also be included as a filter in the Export popup?

## Proposed Approaches
1. **Standalone Export Dialog**: Create an `ExportMaterialAnalysisDialog` component that fetches data based on its own independent filter state, similar to `ExportReportsDialog`.
2. **Table Styling Alignment**: Apply the `text-[11px]` and specific padding classes from `admin-reports-table.tsx` to the `client.tsx` table. Add the `<Link>` with `ArrowUpRight` for report numbers.

Let's validate these requirements before drafting the plan.
