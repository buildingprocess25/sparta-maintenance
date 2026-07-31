# Validate store legacy area

## Scope

Added branch-specific legacy store area loading query, server action validation/normalization, and source contract spec.

## Context and Sources

- `.superpowers/sdd/task-2-brief.md`
- `app/bmc/database/store-area-options.ts`
- `app/bmc/database/queries.ts`
- `app/bmc/database/actions.ts`

## Changed Files

- `app/bmc/database/queries.ts`: Added `getStoreAreaNamesByBranches` query function and included `areaName: true` in `getStoresByBranches` select.
- `app/bmc/database/actions.ts`: Extended `StorePayload`, added `resolveStoreAreaName` helper, and updated `createStore` / `updateStore` server actions.
- `app/bmc/database/store-area-contract.spec.ts`: Created source-level contract spec file for store area database query and action contracts.
- `docs/agent-notes/2026-07-31-0918-validate-store-legacy-area.md`: Task note.

## Decisions

- Validated legacy `areaName` against options grouped by canonical `branchName`.
- Normalized empty strings or whitespace-only area selections to `null`.
- Permitted existing orphaned `areaName` values on update only when `areaName` remains unchanged for that store.

## Verification

- `npx tsx 'app/bmc/database/store-area-contract.spec.ts'` (RED confirmed on step 2, GREEN confirmed on step 5).
- `npx tsx 'app/bmc/database/store-area-options.spec.ts'` (PASS).

## Remaining Work and Risks

Task 3 (UI integration for store legacy area) and Task 4 (e2e integration).
