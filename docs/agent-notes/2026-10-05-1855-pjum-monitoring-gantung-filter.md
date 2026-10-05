# PJUM Monitoring Gantung Filter Optimization

- **Date:** 2026-10-05
- **Task:** Update dashboard filter to use per-month (default YTD) and optimize query.
- **Context:** The YTD filter for the Monitoring Gantung page could potentially query a massive amount of records, straining the database. The client also requested that the Excel export behavior be aligned with other pages, using a confirmation dialog rather than direct download.
- **Implementation:**
  - `actions.ts`: Optimized the Prisma query using an `OR` block to only fetch hanging reports (`PENDING_REVIEW`, `APPROVED_BMC`, and `COMPLETED` where `pjumExportedAt` is `null`).
  - `actions.ts`: Implemented `unstable_cache` to cache the YTD superset of data, avoiding repetitive database hits when users swap filters.
  - `export-monitoring-dialog.tsx`: Created a new component for the Excel export, containing its own independent filters for Branch and Month.
  - `monitoring-gantung-content.tsx`: Swapped the rolling period filter for a month dropdown (defaulting to YTD).
  - `monitoring-gantung-content.tsx`: Implemented a "Fetch Once, Filter Locally" pattern. The page fetches the YTD superset on mount, and any subsequent filter changes (branch, month, search) are executed instantly via JavaScript filtering in the client.
- **Status:** Complete. Data loads optimally and client-side filtering works seamlessly.
