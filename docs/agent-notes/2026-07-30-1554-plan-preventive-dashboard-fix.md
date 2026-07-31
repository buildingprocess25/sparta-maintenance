# Preventive dashboard fix implementation plan

## Scope

Document the implementation plan for correcting Preventive completed/pending tabs, server-side store search, and current-branch summaries. No production code, schema, migration, or database data changes are included.

## Context and Sources

- AI_RULES.md
- docs/project/05-routes-and-ui.md
- docs/project/06-database.md
- app/dashboard/preventive/actions.ts
- app/dashboard/preventive/page.tsx
- app/dashboard/preventive/_components/admin-preventive-table.tsx
- User-provided production screenshots of the incorrect tabs and legacy branch list.

## Changed Files

- docs/superpowers/plans/2026-07-30-fix-preventive-dashboard.md: executable implementation plan.
- docs/agent-notes/2026-07-30-1554-plan-preventive-dashboard-fix.md: task decision record.

## Decisions

Preventive dashboard branch identity must come from Store.branchName, not the approval hierarchy inferred from User.branchNames and not Store.areaName. Server-side completion filtering and search will drive cursor pagination so displayed lists are complete for the selected filter.

## Verification

- Reviewed current server action and client table data flow.
- Confirmed Store.branchName and Store.areaName are separate schema fields.
- Confirmed the current table filters search only over already-loaded client rows.

## Remaining Work and Risks

Implementation and browser acceptance validation remain pending explicit approval to execute the plan.
