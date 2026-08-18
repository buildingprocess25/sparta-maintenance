# Add the explicit post-merge repair mode

## Scope

Added a targeted post-merge repair mode to the `merge-branch-scopes.ts` script. This repair mode strictly limits updates to rows whose current `branchName` is one of the old legacy names. It correctly handles falling back to the old branch name as `areaName` when `areaName` is currently empty. The default branch merging functionality remains unchanged and isolated from this new mode.

## Context and Sources

- `scripts/merge-branch-scopes.ts`
- Task 3 of the Post-Merge Legacy Branch Repair plan.

## Changed Files

- `scripts/merge-branch-scopes.ts`: Extracted `refreshPjumAreas`, integrated `LEGACY_BRANCH_MERGES` from `lib/branch-merges.ts`, and added `--repair-post-merge` flag handler.
- `scripts/merge-branch-scopes.spec.ts`: Created to assert the script contains correct repair functionality.

## Decisions

- Reused `refreshPjumAreas` extracting it out of `main` to allow calling it directly from the repair function without duplicating the cursor pagination logic.
- Implemented exact specifications from the task brief, explicitly guarding against writing without `--execute`.

## Verification

- Wrote regex assertions to verify `merge-branch-scopes.ts` code matches the requested logic.
- Self-tested `merge-branch-scopes.ts` to ensure original functionality (e.g. `normalizeUserBranches` tests) are green.

## Remaining Work and Risks

None
