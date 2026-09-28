# DB Pool Optimization

## Scope

Optimizing database connection pool usage by adding caching to frequently called operations and consolidating parallel `count()` queries into single `groupBy` queries. 

## Context and Sources

- `timeout exceeded when trying to connect` error in production when ~100 users are online.
- `lib/authorization.ts` `getAuthUser` was being called 60+ times per request without deduplication.
- `app/dashboard/queries.ts` had heavy usage of `Promise.all` with individual `count()` queries which consumed multiple DB connections per page load.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts` fired every 10 seconds.

## Changed Files

- `lib/authorization.ts`: Wrapped `getAuthUser` with React `cache()`.
- `lib/app-settings.ts`: Cached `getReportSlaDays` and `getPjumPolicySettings` using `unstable_cache`.
- `app/dashboard/settings/page.tsx` & `actions.ts`: Added cache revalidation on setting updates.
- `app/dashboard/queries.ts`: 
  - Cached `getAdminBranchHierarchy` with `unstable_cache`.
  - Consolidated `getUserStats` (6 counts -> 1 groupBy).
  - Consolidated `getBMCStats` (4 counts -> 1 groupBy).
  - Consolidated `getBNMStats` (3 counts -> 1 groupBy).
- `app/dashboard/users/actions.ts`: Added cache revalidation for branch hierarchy on user changes.
- `app/dashboard/stores/actions.ts`: Added cache revalidation for branch hierarchy on store changes.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: Increased autosave interval to 17s.

## Decisions

- **React Cache:** Used React `cache()` for `getAuthUser` as it only needs to deduplicate requests within a single SSR render cycle.
- **Unstable Cache:** Used Next.js `unstable_cache` for settings and branch hierarchies as they change rarely and are queried across all users. Included 5-10 minute revalidation and tag-based on-demand revalidation.
- **Query Consolidation:** Changed `Promise.all` of `count` queries to single `groupBy` queries to save DB connections, counting results in JS.
- **Autosave Interval:** Changed to 17 seconds (from 10s) to balance fast draft protection and DB load.

## Verification

- Ran `npx tsc --noEmit` to verify type safety across the modifications. Types and signatures were preserved.

## Remaining Work and Risks

None
