# Maintenance Report Export - Preventive Indicator Column

## Background
The maintenance report export currently provides various details about reports, but it lacks a direct indicator of whether a report represents a "Preventive Checklist" visit or a standard maintenance visit. The user wants to add a new column to the XLSX export indicating this status (Ya/Tidak).

## Selected Approach (Option 2 - Database-Level Evaluation)
We will evaluate the preventive status at the database level using a raw SQL sub-query, rather than pulling the massive `items` JSON payload into the Node.js memory. 

### Why this approach?
A report is defined as "Preventive" if its `items` JSON array contains complete evidence for all required preventive items (defined by `PREVENTIVE_ITEM_IDS`). Since the JSON data has always been recorded for every report since the system was built, **this feature will automatically apply to all existing reports** (retroactive) as well as new ones.

## Proposed Changes

1. **`app/admin/export/queries.ts`**
   - **`fetchReportExportRows`**:
     - After fetching the initial `reports` array using Prisma's `findMany`, extract all `reportNumber` values.
     - Execute a raw SQL query using `prisma.$queryRaw` that filters the `Report` table where the `reportNumber` is in the extracted list AND satisfies `completePreventiveEvidenceSql`.
     - Create a `Set` of the resulting `reportNumber`s (these are the proven preventive reports).
     - During the `reports.map` iteration, inject `isPreventive: preventiveSet.has(r.reportNumber)` into the returned row object.
   - Update the `ReportExportRow` interface (if explicitly defined or inferred) to include `isPreventive: boolean`.

2. **`app/api/admin/export/route.ts`**
   - **`REPORT_EXPORT_COLUMNS`** (or the equivalent header configuration for the maintenance report sheet):
     - Add a new header/column for "Checklist Preventif".
   - **`buildReportSheet`** (or equivalent builder):
     - Map the boolean `isPreventive` to a user-friendly string (e.g., `"Ya"` or `"Tidak"`).
     - Add this cell to the row mapping logic, positioned logically (perhaps near the Report Number or Status column).

## Trade-offs Considered
- **Two Queries instead of One**: This requires executing an additional query after the main fetch. However, doing `WHERE reportNumber IN (...)` is extremely fast and completely eliminates the risk of Node.js running out of memory (OOM) compared to fetching the JSON column for thousands of rows.

## Testing Strategy
- Generate a Maintenance Report Export locally for a time range that includes both known preventive reports (e.g., quarterly visits) and regular incidental reports.
- Verify that the new column appears.
- Verify that the older reports (from previous months) accurately display "Ya" or "Tidak" based on their historical data.
