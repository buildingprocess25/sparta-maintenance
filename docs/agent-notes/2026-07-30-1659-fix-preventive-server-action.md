# Task 2: Server-filter preventive completion and remove branch hierarchy

## Scope

Refactor `getAdminPreventive` in `actions.ts` so the server filters by
`completion` before cursor-paging, builds branch summaries from
`Store.branchName` only (no hierarchy), and exposes
`getPreventiveBranchOptions()`. Also adds `PreventiveCompletion` type and
`getPreventiveCompletionForTab` helper to `preventive-dashboard.ts`.

Intentionally outside scope:
- No schema change, migration, or production data change.
- `pendingRows` kept in `AdminPreventiveResult` and return value — client
  still uses it. Task 3 will remove it from the client and then this field
  can be dropped.
- No client-side changes.

## Context and Sources

- Brief: `.superpowers/sdd/task-2-preventive-brief.md`
- Plan: `docs/superpowers/plans/2026-07-30-fix-preventive-dashboard.md`
- Task 1 output: `app/dashboard/preventive/preventive-dashboard.ts`
- Client: `app/dashboard/preventive/_components/admin-preventive-table.tsx`
  — confirmed `pendingRows` and `lastDoneAt` (per branch) are actively
  displayed; both preserved.

## Changed Files

- `app/dashboard/preventive/preventive-dashboard.ts`: Added
  `PreventiveCompletion` type and `getPreventiveCompletionForTab` helper.
- `app/dashboard/preventive/preventive-dashboard.spec.ts`: Extended with
  Task 2 paging assertions using `paginatePreventiveRows` on pending-filtered
  rows.
- `app/dashboard/preventive/actions.ts`:
  - Added `completion?: PreventiveCompletion` to `AdminPreventiveFilters`.
  - Removed `getAdminBranchHierarchy` import and `AdminBranchHierarchy` import.
  - Removed `getAdminBranchChildren()` and `resolveDashboardBranchName()`
    functions and all `adminHierarchy`/`selectedAdminBranchNames` logic.
  - Replaced old cursor-paging logic with `splitPreventiveRows` +
    `paginatePreventiveRows` (server-side completion filtering before paging).
  - Branch filter now uses exact `where.branchName = filters.branchName` (no
    hierarchy expansion).
  - Report predicate for ADMIN + branchName filter now uses `=` scalar
    instead of `IN (array)`.
  - Replaced 70-line branch-accumulator block with
    `summarizePreventiveBranches()` + separate `branchLastDoneAtMap` pass
    (preserves `lastDoneAt` per branch).
  - Added `getPreventiveBranchOptions()` server action.
  - Removed `PreventiveBranchAccumulator` internal type (no longer needed).

## Decisions

1. **Keep `pendingRows` in return shape**: Client `admin-preventive-table.tsx`
   at line 244-246 reads `initialData.pendingRows` and displays it in the
   "Belum Checklist" tab. Removing it now would break the client. Task 3 will
   migrate the client to server-filtered pagination instead.

2. **Preserve `lastDoneAt` per branch**: The branch table in the client
   renders `branch.lastDoneAt` (line 997). Preserved by computing a separate
   `branchLastDoneAtMap` pass over `allRows` before calling
   `summarizePreventiveBranches`.

3. **Exact branch filter for reports**: When `filters.branchName` is set for
   ADMIN, the raw SQL now uses `r."branchName" = ?` (scalar) instead of `IN
   (array)` because the hierarchy expansion is removed.

4. **No circular dependency**: `actions.ts` imports from
   `./preventive-dashboard` (same directory). `preventive-dashboard.ts` has
   no imports. Safe.

## Verification

```
npx tsx app/dashboard/preventive/preventive-dashboard.spec.ts
# → "preventive dashboard assertions passed"
# → "paginatePreventiveRows paging assertions passed"

npx eslint app/dashboard/preventive/actions.ts \
           app/dashboard/preventive/preventive-dashboard.ts \
           app/dashboard/preventive/preventive-dashboard.spec.ts
# → no output (exit 0, no errors/warnings)
```

## Remaining Work and Risks

- `pendingRows` in `AdminPreventiveResult` is dead weight until Task 3
  migrates the client.
- The "Belum Checklist" tab still does client-side filtering from the
  `pendingRows` array returned by the server, not server-side pagination. Task
  3 should switch that tab to call `getAdminPreventive` with
  `completion: "pending"` instead.
