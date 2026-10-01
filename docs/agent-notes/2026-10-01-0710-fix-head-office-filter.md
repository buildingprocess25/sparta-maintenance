# Fix Head Office Filter in Manager Dashboard

## Scope

Fixed an issue where users logged in as managers of `HEAD OFFICE` would see an empty Realisasi Chart because the query explicitly excluded the `HEAD OFFICE` branch even when requested via `branchScope`.

## Context and Sources

- `app/dashboard/queries.ts`
- User report that logging in as BMC for `Head Office` returns empty data.

## Changed Files

- `app/dashboard/queries.ts`: Made the `NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME }` condition mutually exclusive with `branchScope`. If `branchScope` is provided, we respect it (even if it contains `HEAD OFFICE`). Otherwise, we exclude `HEAD OFFICE` globally for Admin dashboards.

## Decisions

- Admin dashboard requires `HEAD OFFICE` to be excluded from global aggregates. But when scoping down to a specific branch (which Manager Dashboards do via `branchScope`), we must include it if the manager actually belongs to `HEAD OFFICE`.

## Verification

- Changed Prisma query syntax safely. `npm run dev` running successfully.

## Remaining Work and Risks

None
