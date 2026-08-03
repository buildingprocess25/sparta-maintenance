# Task 1: Build the visible branch-name set

## Scope

Implemented `getVisibleBrandBranchNames` helper function in `lib/store-brand-filter.ts` and added unit test coverage in `lib/store-brand-filter.test.ts`.

## Context and Sources

- `.superpowers/sdd/task-1-brief.md`
- `docs/superpowers/plans/2026-08-03-brand-owned-branches.md`

## Changed Files

- `lib/store-brand-filter.ts`: added `getVisibleBrandBranchNames` helper function.
- `lib/store-brand-filter.test.ts`: added test suite for `getVisibleBrandBranchNames`.

## Decisions

- Handled brand filtering logic for branch names where `'ALL'` returns all branch names while specific brand returns `ownedBranchNames`.

## Verification

- `npx tsx lib/store-brand-filter.test.ts` passed (5/5 tests passing).

## Remaining Work and Risks

- Tasks 2 and 3 remain to update branch queries and UI table/export filters.
