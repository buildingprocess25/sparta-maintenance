# Preventive Checklist Export - NIK BMS Column

## Background
Currently, the preventive checklist export (`/api/admin/export`) outputs the BMS name for each quarter in the `TW[X] BMS` column. If a name is not found, it falls back to displaying the NIK in the same column. The user wants to add a dedicated column for the BMS NIK so the exported data can be processed more easily using Excel functions (e.g., VLOOKUP) without needing to extract the NIK from the name string.

## Selected Approach (Option 1)
We will introduce a dedicated NIK column for each quarter.
The new column format will be:
`TW[X] NIK` | `TW[X] BMS` | `TW[X] TGL`

## Proposed Changes

1. **`app/admin/export/queries.ts`**
   - **`fetchPreventiveExportRows`**: Modify the `formatQuarter` function to return an object with three distinct fields:
     - `nik`: The NIK of the BMS (`info.bmsNIK`).
     - `by`: The name of the BMS (`info.bmsName`).
     - `date`: The timestamp of completion (`info.doneAt`).
   - Update the `PreventiveExportRow` type (or the inferred return type) to accommodate the separated `nik` and `name` properties for each quarter.

2. **`app/api/admin/export/route.ts`**
   - **`PREVENTIVE_QUARTER_COLUMNS`**: Add a new property to each quarter's configuration:
     - `nik`: "q[X]Nik"
     - `nikHeader`: "TW[X] NIK"
   - **`buildPreventiveSheet`**:
     - Update the header construction to include the new `nikHeader`.
     - Update the row data mapping to push the `nik` cell value before the `by` (BMS Name) cell value.
     - Ensure the columns are ordered logically: `... | TW[X] NIK | TW[X] BMS | TW[X] TGL | ...`

## Trade-offs Considered
- **Added Width**: This approach adds 4 new columns (one for each quarter) to the export sheet, making it wider. However, the trade-off is highly justified because having clean, separate identifiers (NIK) is essential for tabular data processing.

## Testing Strategy
- **Local Testing**: The user can test this locally by changing their local BMC account's assigned branch from `HEAD OFFICE` to a valid operational branch (e.g., `BALARAJA`) in the local database (via Prisma Studio). This bypasses the hardcoded `HEAD OFFICE` export restriction without altering the application's source code.
- **Verification**: Generate an export and visually verify that the `TW[X] NIK` columns appear and are populated with the correct NIKs, independent of the `TW[X] BMS` name column.
