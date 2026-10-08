# Admin Preventive KPI Widget - BMS Ranking on Branch Filter

## Scope

Updated the Checklist Preventif widget on the Admin Dashboard so that selecting a specific branch filter displays the Top 5 / Bottom 5 BMS ranking for that branch instead of the monthly completion trend.

- **In Scope:** Server action logic in `app/dashboard/preventive/actions.ts` (`getAdminPreventiveKpiData`).
- **Out of Scope:** Component UI alterations (already supported in `PreventiveKpiWidget`).

## Context and Sources

- User request: Modify widget logic so specific branch filter shows Top 5 best/worst BMS ranking with identical narrative to BMC/BNM manager dashboard.
- Plan: `docs/plans/2026-10-08-admin-preventive-bms-ranking-plan.md`

## Changed Files

- `app/dashboard/preventive/actions.ts`: Updated `showBmsView` condition to trigger when `branchName && branchName !== "all"`, fetching BMS store assignments per selected branch.
- `docs/plans/task.md`: Updated live task tracking status.

## Decisions

- Set `viewMode = "BMS"` in `getAdminPreventiveKpiData` whenever `branchName !== "all"`.
- Utilized existing `PreventiveKpiWidget` BMS rendering logic (which already handles rank indexing, toggle sort for best/worst, and "BMS Preventif Terbaik/Terburuk" titles).

## Verification

- TypeScript & Next.js production build: `npm run build:memory`.

## Remaining Work and Risks

None.
