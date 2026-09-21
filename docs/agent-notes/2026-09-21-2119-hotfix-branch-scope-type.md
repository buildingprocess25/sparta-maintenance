# Hotfix Branch Scope Type Error

## Scope

Fix a TypeScript build error where `Set` was incorrectly assumed to have a `filter` method.

## Context and Sources

- `npm run build:memory` failed in `main` branch due to `visibleBranchNames.filter` being called on a `Set`.

## Changed Files

- `app/dashboard/queries.ts`: Converted `visibleBranchNames` (a `Set`) to an array using the spread operator before calling `.filter()`, and wrapped the result back into a `Set`.

## Decisions

- Standard JS arrays provide `.filter()`, so a quick array conversion solves the issue elegantly without changing the return types or method signatures.

## Verification

- `npm run build:memory` passed successfully locally in the `main` branch.

## Remaining Work and Risks

None
