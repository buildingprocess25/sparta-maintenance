# Fix Brand Branch Review Findings

## Scope

Fixes verified review findings in ADMIN Brand branch filtering and Dashboard
breakdown queries. No schema, migration, production data, export, BMC, or BNM
behavior is changed.

## Context and Sources

- `docs/superpowers/specs/2026-08-03-brand-owned-branches-design.md`
- `docs/superpowers/plans/2026-08-03-brand-owned-branches.md`
- Review of `app/dashboard/branches/actions.ts` and `app/dashboard/queries.ts`

## Changed Files

- `app/dashboard/branches/actions.ts`: limits the branch list and direct branch
  detail access to branches with an active selected-brand store.
- `app/dashboard/queries.ts`: removes unused per-brand breakdown queries and
  skips the store lookup for Brand `ALL`.
- `app/dashboard/branches/actions.test.ts`: regression check for scoped list
  and detail behavior.
- `app/dashboard/queries-brand-breakdown.test.ts`: regression check for the
  minimal breakdown payload and `ALL` fast path.
- `app/dashboard/_components/admin/admin-trend-filter.test.ts`: checks both
  visible breakdown label pairs use the required colors.

## Decisions

- The existing `getVisibleBrandBranchNames()` helper is the shared ownership
  rule for list and detail views.
- Brand breakdown keeps only KPI fields because no UI reads the removed data.

## Verification

- Focused branch, breakdown, color, and store-brand tests passed.
- Focused ESLint, `npx tsc --noEmit`, and `git diff --check` passed.

## Remaining Work and Risks

Manual browser validation remains useful for a Brand-specific branch list and
direct URL to a non-owned branch.
