# BMC Store Legacy Branch Design

## Goal

Let BMC mark a store's optional legacy operational area without putting that value into the store's canonical `branchName`. The form label is **Cabang Lama**.

## Scope

This design changes the BMC create and edit store form, its data query, and server-side store payload validation.

It does not add a schema migration, new master-area table, import-XLSX area column, bulk data correction, or automatic conversion of user scopes. Current import behavior remains unchanged.

## Data Contract

- `Store.branchName` remains the canonical current branch.
- `Store.areaName` stores the optional legacy area.
- A BMC may submit a legacy area only for the selected canonical branch.
- `User.branchNames` must hold canonical branches. Legacy approval scopes belong in `User.areaNames`; correcting existing user scopes requires a separately approved mapping and data task.

## Form Behavior

The existing **Cabang** selector continues to determine the canonical `branchName`.

Below it, show a **Cabang Lama** select only when the selected branch has at least one stored non-empty `areaName`. The options are the distinct legacy areas already associated with that branch. The field is optional and includes a clear/no-selection option.

When the BMC changes **Cabang**, clear the selected legacy area before rendering the new branch's options. A single-branch BMC uses its only branch as the selected branch, so the same rule applies without rendering the canonical branch selector.

Edit mode keeps the current canonical branch read-only, matching the existing form. It shows the legacy-area select for that branch when options exist, prefills the store's saved `areaName`, and lets BMC clear or change it. If an existing store has an orphaned `areaName` that is no longer present on another store, include that saved value solely for that edit so the user can preserve or correct the record.

## Data Flow

1. The BMC database page loads the store list and a small `areaNamesByBranch` map for the BMC's authorized branches.
2. The map is passed through `StoreTable` to `StoreFormDialog`; the dialog reads only the options for its selected canonical branch.
3. Create and update submit `areaName: string | null` in the existing store payload.
4. The server action first authorizes the canonical branch, then validates the supplied legacy area against areas stored under that same branch. For an edit, the store's unchanged saved area is also accepted so a legacy record is not blocked from unrelated edits.
5. The action stores `null` when the optional selection is cleared and revalidates the BMC database page.

## Error Handling

- A forged, stale, or cross-branch legacy-area value is rejected by the server with a clear error.
- Empty or whitespace-only values become `null`.
- If no areas exist for the branch, the UI has no field and submits `null`.
- No implicit area is guessed from the store name, code, or branch.

## Verification

- Add focused assertions for grouping distinct, trimmed area names by branch and for hiding the optional field when the selected branch has no areas.
- Add action-level coverage for valid same-branch input, null input, forged cross-branch input, and preserving an orphaned existing value during edit.
- Run focused lint, relevant tests, `npm run test:agent-note`, and `git diff --check`.
- Manually verify create and edit flows for a branch with areas and a branch without areas.

## Risks and Deferred Work

The dropdown uses existing `Store.areaName` values as its source, not a new master-data table. This is intentionally minimal, but it cannot repair already incorrect `Store.branchName` or `User.branchNames` records. A later admin-approved audit must map legacy branch values to canonical branches and populate `User.areaNames`; it must not infer mappings automatically.
