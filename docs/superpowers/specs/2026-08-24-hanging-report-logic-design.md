# Hanging Report Identification Logic - Design Spec

## Overview
Currently, the system identifies a hanging report (laporan gantung) by comparing the report's completion date against the selected filter date in the UI (`finishedAt < fromDate`). This approach does not accurately reflect the business process. 

A true hanging report is one that was left behind when a BMC exported a PJUM for a given cycle, causing that cycle's operational balance period (`BmsBalancePeriod`) to be closed, while the unselected report remains unexported. 

## Requirements & Constraints
- A hanging report is defined as a report that has `pjumExportedAt === null` AND its `balancePeriod.status === "CLOSED"`.
- Hanging reports MUST always be surfaced in the PJUM creation dashboard, bypassing any date filters selected by the BMC, to ensure they are not forgotten.

## Architecture & Data Flow

### 1. Backend: Query Modification (`actions.ts`)
In `searchDashboardPjumCandidates`:
- The query to fetch reports will be updated to fetch:
  - Reports that fall within the selected `fromDate` and `toDate` (Normal reports).
  - OR Reports whose `balancePeriod.status` is `"CLOSED"` (Hanging reports).
- The `isHangingReport` flag will be explicitly defined as `report.balancePeriod?.status === "CLOSED"`.

### 2. UI: Dashboard Table (`create-pjum-dialog.tsx`)
- The UI layer requires no structural changes, as it already conditionally renders rows based on the `isHangingReport` flag and `invalidReason`.
- The list will now reliably contain hanging reports regardless of the date filter, keeping them visible at all times until they are unlocked and processed.

### 3. Simulation & Seeding
- The local seed script (`seed-hanging.ts`) will be updated to simulate this exact business state.
- It will create a `BmsBalancePeriod` with status `CLOSED` and attach the hanging reports to it, simulating reports that were left behind in a previous cycle.

## Error Handling & Edge Cases
- If a report lacks a `balancePeriodId` (which shouldn't happen based on the `COMPLETED` lifecycle, but handled defensively), it defaults to non-hanging unless explicitly proven otherwise.
- Overlapping active periods: A BMS can only have one `ACTIVE` period. Normal reports will reside there and will not mistakenly be flagged as hanging.

## Testing Strategy
- Run the updated `seed-hanging.ts`.
- Open PJUM creation modal, select a date range that *does not* include the hanging reports' completion dates.
- Verify that the hanging reports still appear at the bottom of the table, locked and requiring the "Minta Persetujuan Buka Laporan" flow.
