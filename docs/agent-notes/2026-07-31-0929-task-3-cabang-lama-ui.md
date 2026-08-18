# Wire Cabang Lama into BMC Store forms

## Scope

Wired the `areaNamesByBranch` mapping into the UI so that the "Cabang Lama" dropdown appears conditionally for stores when the selected canonical branch has legacy area options.

## Context and Sources

- `.superpowers/sdd/task-3-brief.md`
- Previous tasks that added the underlying getStoreAreaNamesByBranches helper and AreaNamesByBranch types.

## Changed Files

- `app/bmc/database/store-area-contract.spec.ts`: Added UI contract assertions.
- `app/bmc/database/page.tsx`: Loaded area mapping via `Promise.all` and passed it down.
- `app/bmc/database/_components/store-table.tsx`: Updated `StoreRow` with `areaName` and forwarded `areaNamesByBranch`.
- `app/bmc/database/_components/store-form-dialog.tsx`: Rendered the conditional optional `<Select>` for `areaName` using `getStoreAreaOptions`, linked reset behavior with canonical branch changes, and passed `areaName` to create/update payloads.

## Decisions

- Preserved existing layout and dialog constraints. Used Shadcn UI components natively.
- "Cabang Lama" resets gracefully (to `null`) when the parent canonical branch is changed, avoiding orphaned legacy values in UI state.

## Verification

- `npx tsx 'app/bmc/database/store-area-contract.spec.ts'` - Passed
- `npx eslint` on modified files - Passed
- Assertions prove that the UI renders the correct label and resets state properly on branch change.

## Remaining Work and Risks

None
