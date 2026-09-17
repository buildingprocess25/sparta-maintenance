# Sync Stores BranchName Lock

## Scope

Modify the daily sync store job to lock the `branchName` field from updates. When a store already exists in the database, its `branchName` must be retained even if the Google Sheet has a different value. Also add a detailed breakdown of `updatedFields` to the cron log.

## Context and Sources

- `lib/jobs/sync-stores.ts`
- Previous sync logs on Dokploy showing 3,617 updates largely driven by `branchName` differences.

## Changed Files

- `lib/jobs/sync-stores.ts`: Removed `branchName` from the update payload and change conditions; added field-level tracking (`updatedFields`).
- `scripts/sync-stores-from-sheet.ts`: Appended the `updatedFields` breakdown to the log output.
- `scripts/sync-stores-from-sheet.spec.ts`: Added unit tests asserting that `branchName` changes don't trigger updates and `updatedFields` is correctly populated.

## Decisions

- Retained `branchName` for new store creations; the lock applies only to updates.
- Tracked changed fields via an `updatedFields` dictionary to keep logs compact but informative.
- Removed `branchName` entirely from the Prisma `update` call instead of just ignoring the change check, ensuring it's never accidentally touched.

## Verification

- Wrote and passed unit tests (`npx tsx scripts/sync-stores-from-sheet.spec.ts`).
- Confirmed cron route automatically passes the new `updatedFields` payload back in the JSON response.

## Remaining Work and Risks

None.
