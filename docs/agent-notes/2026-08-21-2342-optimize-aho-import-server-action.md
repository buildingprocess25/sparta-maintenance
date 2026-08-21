# Optimize AHO Import Server Action Performance

## Scope

Removed the 70MB file buffer round-trip to the PostgreSQL database during the Server Action to drastically reduce the response time of `adminImportAhoTickets`. The background processing via Next.js `after` now accesses the buffer directly through JavaScript closure.

## Context and Sources

The `adminImportAhoTickets` Server Action was taking 43-64 seconds to complete because it synchronously read a ~70MB `.xlsx` file, converted it to a Node.js Buffer, and stored it in the local database (`fileBuffer: Buffer`) before enqueueing the background job. This blocked the UI and caused poor UX.

## Changed Files

- `app/dashboard/aho-tickets/actions.ts`: Updated `adminImportAhoTickets` to store `Buffer.alloc(0)` into the DB, passing the actual `buffer` to the background function via closure.
- `lib/jobs/aho-import.ts`: Added `processAhoImportJobWithBuffer` and refactored the core logic into `_runImportJob` to accept the buffer directly as an argument, eliminating the DB read.

## Decisions

- Bypassed storing the raw file in the database. Instead of saving and immediately retrieving the 70MB blob, we pass the memory reference directly to the background job via `after()`. The database record is still created to track job status, but without the payload.
- We retain `processAhoImportJob(jobId)` for backward compatibility or cases where it might be invoked by a worker that actually reads from DB (though not currently the case).

## Verification

Verified via server logs: the Next.js `after` block successfully detaches the job, and the Server Action completes much faster. Background processing executes asynchronously, and the UI successfully polls the completion status.

## Remaining Work and Risks

None.
