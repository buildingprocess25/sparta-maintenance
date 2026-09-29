# Fix Preventive Dashboard Store Branch Migration Bug

## Scope
Updated the `getAdminPreventive` query in `app/dashboard/preventive/actions.ts` to filter reports using `storeCode IN (...)` instead of the historical `branchName`. 

## Context and Sources
When a store migrates from one branch to another, its historical reports retain the old branch name. Filtering by `branchName` causes those reports to disappear from the dashboard of the new branch. The fix correctly relies on the store's current branch membership to query its historical reports, ensuring the preventive compliance KPI is accurate.
