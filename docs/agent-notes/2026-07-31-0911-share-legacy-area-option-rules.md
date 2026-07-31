# Share the legacy-area option rules

## Scope

Implemented `store-area-options.ts` and `store-area-options.spec.ts` to group legacy store area names by branch and build dropdown options including any current/orphan area name.

## Context and Sources

- `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-1-brief.md`

## Changed Files

- `app/bmc/database/store-area-options.ts`: shared pure helper for grouping legacy store area names by branch and getting dropdown options.
- `app/bmc/database/store-area-options.spec.ts`: pure assertion tests for area option helpers.

## Decisions

- Cleaned and normalized area strings (`trim()`, blank -> `null`).
- Sorted area names using `localeCompare(b, "id")` to match Indonesian locale string ordering requirements.

## Verification

- Ran `npx tsx 'app/bmc/database/store-area-options.spec.ts'` (verified RED then GREEN).

## Remaining Work and Risks

- None for Task 1. Task 2 will consume these helpers for server-side validation, and Task 3 for UI store dialog.
