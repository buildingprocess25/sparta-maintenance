# Monitoring Laporan Gantung - Design Spec

## Overview
A new page in the admin dashboard to monitor "Laporan Gantung" (hanging reports) alongside reports that are pending review from BMC and BNM. The system will categorize reports into three distinct buckets, calculate the duration they have been hanging, and present them in a tabbed interface. An Export to Excel feature will allow admins to download the exact view directly from the client.

## Requirements & Constraints
- Only include active BMS (excluding users and reports associated with "HEAD OFFICE").
- Ignore reports with `totalReal` of Rp 0.
- Use `createdAt` (report creation date) as the anchor date for fetching the population within a selected date range.
- **Hanging Definition (Sheet 3):** `status === 'COMPLETED'` AND `pjumExportedAt === null` AND `report.finishedAt < latestPjum.createdAt` (for that specific BMS).
- The dashboard must not block or lag on initial page load; data is fetched on-demand when the user clicks "Load Data".

## Architecture & Data Flow

### 1. Backend: Server Action (`app/dashboard/pjum/monitoring-gantung/actions.ts`)
- `getMonitoringGantungData(startDate: string, endDate: string)`
- Queries all active BMS except "HEAD OFFICE".
- Fetches all reports created between the dates with statuses `PENDING_REVIEW`, `APPROVED_BMC`, `COMPLETED`.
- Iterates over reports, categorizes them into 3 tabs:
  - "BMC Belum" (Pending Review)
  - "BNM Belum" (Approved BMC)
  - "Gantung Real" (Completed but omitted from PJUM)
- Calculates hanging duration bucket (`0-7 Hari`, `8-14 Hari`, etc.) using `updatedAt` (for Sheet 1 & 2) and `finishedAt` (for Sheet 3).
- Returns a structured JSON payload representing the 3 tabs and the bucketed data per BMS.

### 2. Frontend: UI (`app/dashboard/pjum/monitoring-gantung/page.tsx`)
- **Header:** Title + 2 native Date Inputs (`<input type="date">` for simplicity and robustness without external libraries) + "Load Data" Button + "Export to Excel" Button.
- **State:** `isLoading`, `data` (JSON returned from server action).
- **Display:** `Tabs` component with 3 panels. Each panel renders a `Table` showing BMS Name, NIK, Branch, Latest PJUM Date, and the 5 buckets.
- **Export Excel:** Re-uses the JSON `data` state. Utilizes the `xlsx` package in the browser to build the workbook and trigger a download, preventing an extra database query.

## Error Handling & Edge Cases
- **No Data:** Show an empty state component if the action returns empty maps.
- **Long Load Times:** The action might take 10-20 seconds for large date ranges. The UI must disable the "Load Data" button and show a clear `Spinner` or loading message.
- **Data Shape:** Ensure the JSON serialization safely handles Dates by returning ISO strings or numbers.
