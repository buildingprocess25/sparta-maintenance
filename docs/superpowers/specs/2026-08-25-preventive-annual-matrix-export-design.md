# Preventive Annual Matrix Export Design

## Goal

Add a new XLSX export for the admin Checklist Preventif annual matrix without changing the existing dashboard behavior or the existing top-level Export XLSX flow.

The export should help admins identify which stores have not completed the required once-per-quarter preventive checklist and see the related preventive spending totals.

## Current Behavior To Preserve

The dashboard currently treats a report as preventive when it has complete preventive checklist evidence:

- `Report.status` is not `DRAFT`.
- `Report.items` contains every required preventive item from `PREVENTIVE_ITEM_IDS`.
- Each required preventive item has `preventiveCondition` set to `OK`, `NOT_OK`, or `TIDAK_ADA`.

For each store and quarter, the annual matrix currently displays the latest qualifying report in that quarter. The new export must use the same selection rule so the exported cells match the current dashboard semantics.

The existing header Export XLSX button and its existing format are out of scope and must not be changed.

## Export Entry Point

Add a new export button scoped to the `Matriks Tahunan` tab in the admin preventive dashboard. The button opens a dedicated filter dialog instead of immediately downloading.

The dialog filters are:

- Cabang
- Brand
- Tahun
- Triwulan
- Status: `Semua`, `Sudah Checklist`, `Belum Checklist`

The export remains an annual matrix, so the XLSX includes columns for Triwulan 1 through Triwulan 4. The selected `Triwulan` only determines how the `Status` filter is applied.

Example: if the user selects `Tahun 2026`, `Triwulan 3`, and `Belum Checklist`, the exported stores are those that are pending for Triwulan 3 in 2026, while the sheet still shows Q1, Q2, Q3, and Q4 columns for those stores.

## Workbook Shape

Create a workbook with two sheets.

### Sheet 1: Matriks Tahunan

One row per store after applying the dialog filters.

Columns:

- No
- Kode Toko
- Nama Toko
- Cabang
- Triwulan 1 Jan-Mar
- Nominal Triwulan 1
- Triwulan 2 Apr-Jun
- Nominal Triwulan 2
- Triwulan 3 Jul-Sep
- Nominal Triwulan 3
- Triwulan 4 Okt-Des
- Nominal Triwulan 4

Each triwulan cell follows the dashboard display:

- `Belum` when no qualifying report exists for that store and quarter.
- `dd MMM yyyy` plus BMS name when a qualifying report exists.
- If BMS name is empty, use BMS NIK.
- Do not add extra details such as report number to the visible cell value.

Nominal columns:

- Read from `Report.totalReal` on the same report selected for the matrix cell.
- Empty when no qualifying report exists.
- Empty when `totalReal` is `null`.
- Numeric zero when `totalReal` is exactly zero.

### Sheet 2: Ringkasan Cabang

One row per branch included in the export, plus a grand total row.

Columns:

- Cabang
- Target Toko
- Sudah Checklist
- Belum Checklist
- Coverage
- Total Nominal Triwulan 1
- Total Nominal Triwulan 2
- Total Nominal Triwulan 3
- Total Nominal Triwulan 4
- Total Nominal Tahun

The selected `Triwulan` determines `Sudah Checklist`, `Belum Checklist`, and `Coverage`.

Nominal totals sum the visible store rows in the export. A missing or `null` `totalReal` does not contribute to the total.

## Data Flow

Create a dedicated server-side export path for the annual preventive matrix. It should reuse the same preventive report qualification logic as the dashboard and preserve role/branch authorization.

The export query should fetch all matching stores, not just the currently loaded paginated rows. It should apply:

- authenticated user branch scope
- selected branch
- selected brand
- selected year
- selected triwulan for status filtering
- selected status filter

The existing dashboard action can remain unchanged. If implementation needs shared helpers to avoid duplicating the report-selection logic, extract a focused helper while preserving the dashboard's returned data and behavior.

## UI Behavior

The new dialog should follow the style and interaction pattern of the existing preventive XLSX export dialog:

- open from a button in or near the `Matriks Tahunan` tab
- show filters before downloading
- show loading state while generating
- download the generated `.xlsx`
- show a clear error message when export fails

Use existing shadcn/ui components and project patterns.

## Error Handling

The export must reject unauthorized users. It should return a user-friendly failure if the workbook cannot be generated or downloaded.

If filters produce no rows, still generate a valid workbook with headers and an empty data area.

## Testing

Add focused tests for the export data shaping where practical:

- latest qualifying report wins for a store-quarter
- status filter uses the selected quarter
- `totalReal = null` exports blank
- `totalReal = 0` exports numeric zero
- branch summary totals only include exported rows

Run the relevant lint/type/test checks after implementation.

## Out Of Scope

- Changing the current dashboard matrix logic.
- Changing the existing top-level Export XLSX flow.
- Changing how reports are classified as preventive.
- Adding a new explicit report type field.
