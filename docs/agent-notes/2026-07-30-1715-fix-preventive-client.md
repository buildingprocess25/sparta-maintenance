# Drive Preventive Dashboard visible list from server filters

## Scope

Migrates the client from client-side tab filtering to server-driven completion filtering for the Preventive Dashboard. The 'Belum Checklist' tab now calls the server with `completion: "pending"` instead of rendering a static `pendingRows` array. The 'Sudah Checklist' tab now calls the server with `completion: "completed"`.

## Context and Sources

- `docs/superpowers/plans/2026-07-30-fix-preventive-dashboard.md`
- `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-3-preventive-brief.md`

## Changed Files

- `app/dashboard/preventive/preventive-dashboard.spec.ts`: Extended with tab mapping assertions.
- `app/dashboard/preventive/preventive-dashboard.ts`: Updated `getPreventiveCompletionForTab` to map `"quarter" -> "completed"`.
- `app/dashboard/preventive/page.tsx`: Switched to `getPreventiveBranchOptions`, added `completion: "completed"` to initial load.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Refactored to controlled Tabs, removed `pendingRows` state, implemented server-driven search.

## Decisions

- Kept tab value `"quarter"` for Sudah Checklist and mapped it to `"completed"` in `getPreventiveCompletionForTab`.
- Removed `matchesStoreSearch` for `filteredRows` and `filteredPendingRows` as the server handles search for the active tab list.
- Kept `filteredHistoryRows` using `matchesStoreSearch` client-side as `latestReports` still loads unpaginated history items from server.

## Verification

- `npx tsx 'app/dashboard/preventive/preventive-dashboard.spec.ts'` returned RED before the fix, and GREEN after.
- `git diff --check` passed.
- `npx eslint` was attempted.

## Remaining Work and Risks

None.
