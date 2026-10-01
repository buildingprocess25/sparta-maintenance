# Fix Active Users Count for Managers

## Scope

Fixed a bug in `getAdminVisibleTodayActiveUserCount` where the active users metric on the command center dashboard was showing the total global active users (minus Head Office) for ALL managers, instead of scoping it down to only their authorized branches.

## Changed Files

- `app/dashboard/queries.ts`

## Decisions

- Updated `getAdminVisibleTodayActiveUserCount` to accept an optional `branchScope?: string[]` array.
- If `branchScope` is provided (e.g. for BMC/BNM users), the Prisma query will use `{ branchNames: { hasSome: branchScope } }` instead of the global `NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } }` filter.
- Passed `branchScope` from `getAdminCommandCenterData` down to this function.
