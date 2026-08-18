# Extract and Test Approved Branch Mapping

## Scope

Extracted the approved mapping of 8 legacy branch names into a pure shared helper `lib/branch-merges.ts` and added unit test assertions in `lib/branch-merges.spec.ts`.

## Context and Sources

- SDD Task 1 brief: `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-1-brief.md`
- Post-Merge Legacy Branch Repair plan: `docs/agent-notes/2026-07-31-1009-plan-post-merge-legacy-branch-repair.md`

## Changed Files

- `lib/branch-merges.ts`: Exported `LEGACY_BRANCH_MERGES`, `getCanonicalBranchName`, `getLegacyBranchMessage`, and `getWritableBranchNames`.
- `lib/branch-merges.spec.ts`: Unit test assertions validating mapping, messaging, whitespace handling, and writable branch filtering.

## Decisions

- Centralized legacy branch canonicalization logic into a single pure helper without dependencies.

## Verification

- Ran `npx tsx lib/branch-merges.spec.ts` prior to implementation: failed with `MODULE_NOT_FOUND` as expected (RED).
- Ran `npx tsx lib/branch-merges.spec.ts` after implementation: passed cleanly with `branch merge assertions passed` (GREEN).

## Remaining Work and Risks

None. Task 1 is complete.
