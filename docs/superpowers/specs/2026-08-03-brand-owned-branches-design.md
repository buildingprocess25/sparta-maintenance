# Brand-Owned Branches Design

## Goal

Make the ADMIN dashboard show only branches that own at least one active store
of the selected Brand, and correct the visual brand colors.

## Scope

- Alfamart breakdown labels use red; Lawson labels use blue.
- With Brand `ALFAMART` or `LAWSON`, "Realisasi per Cabang" and "Performa
  Cabang" contain only branches with an active `Store` in that Brand.
- With Brand `ALL`, both views retain their current branch coverage.
- Brand controls and data scope remain ADMIN-only.

## Data Rule

A branch belongs to a selected Brand when at least one active `Store` row has
that `branchName` and satisfies the existing `getStoreBrandWhere()` predicate.
This includes a new Lawson branch before its first report and excludes a branch
that only has historical reports for that Brand.

## Design

Reuse the existing store-brand predicate and obtain the eligible branch names
once per dashboard query. Filter the maps or arrays that produce the two branch
views against that set. Do not create a static brand-to-branch mapping and do
not change report-level KPI filtering.

The existing breakdown markup remains unchanged except for swapping its color
classes: Alfamart is red and Lawson is blue.

## Error Handling

An empty eligible-branch set produces an empty branch view. It must not fall
back to all branches.

## Verification

- Focused unit test covers `ALL`, Alfamart, Lawson, and an empty eligible set.
- ESLint for changed files, `npx tsc --noEmit`, and `git diff --check` pass.
- Manual ADMIN check confirms a Lawson-only branch appears in both views, while
  an Alfamart-only branch does not; verify the reverse for Alfamart.

## Out of Scope

- No database migration, production data update, export change, or BMC/BNM UI
  change.
