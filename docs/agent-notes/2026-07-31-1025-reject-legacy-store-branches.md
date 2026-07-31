# Reject legacy branch store writes and hide unsafe write options

## Scope

Added validation in BMC store actions to actively reject legacy branches with a specific error message. Updated the store management UI to hide legacy options and disable the "Tambah Toko" and "Import" buttons entirely if the user manages only legacy branches.

## Context and Sources

- `docs/superpowers/plans/2026-07-31-post-merge-legacy-branch-repair.md`
- `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-2-brief.md`

## Changed Files

- `app/bmc/database/actions.ts`: Added validation guard using `getLegacyStoreBranchError`.
- `app/bmc/database/_components/store-table.tsx`: Filtered `branchNames` using `getWritableBranchNames`.
- `app/bmc/database/_components/store-form-dialog.tsx`: Added `hasWritableBranch` to disable default "Tambah Toko" trigger.
- `app/bmc/database/_components/import-store-dialog.tsx`: Added `hasWritableBranch` to disable "Import" trigger and submit button.
- `app/bmc/database/legacy-branch-write-guard.spec.ts`: Added failing assertions for test-driven development validation.

## Decisions

- Renamed the regex in the spec file to match the function name given in the instructions (`getLegacyStoreBranchError`).
- Passed down `writableBranchNames` via `StoreTable` component to the children dialog forms.
- Re-used `branchNames.length > 0` checks conditionally disable button triggers if the array holds no valid branches.

## Verification

- `npx tsx 'app/bmc/database/legacy-branch-write-guard.spec.ts'` (Passed)
- `npx eslint 'app/bmc/database/actions.ts' 'app/bmc/database/_components/store-table.tsx' 'app/bmc/database/_components/store-form-dialog.tsx' 'app/bmc/database/_components/import-store-dialog.tsx' 'lib/branch-merges.ts'` (Passed)

## Remaining Work and Risks

None
