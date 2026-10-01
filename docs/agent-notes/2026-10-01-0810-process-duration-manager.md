# Process Duration Widget Manager Optimization

## Scope

Updated the `ProcessDurationWidget` so that for managers (BMC/BNM), it correctly displays the "top 5 technicians (BMS)" with the highest duration, instead of attempting to show "top 5 branches" when they only have 1 branch.

## Context and Sources

- `docs/superpowers/plans/2026-10-01-process-duration-manager.md`
- `app/dashboard/preventive/actions.ts`
- `app/dashboard/_components/admin/process-duration-widget.tsx`

## Changed Files

- `app/dashboard/preventive/actions.ts`: 
  - Updated `ProcessDurationItem` type to use a generic `label`.
  - Added `viewMode` flag to `ProcessDurationData`.
  - Modified raw SQL in `getAdminProcessDurationData`. If user is not Admin, it joins the `User` table and groups by `u."name"` (the BMS Name) instead of `r."branchName"`.
- `app/dashboard/_components/admin/process-duration-widget.tsx`: 
  - Updated `renderCard` parameter to expect `label` instead of `branchName`.
  - Added dynamic text mapping based on `data.viewMode`. "5 cabang..." vs "5 teknisi...".

## Decisions

- Renaming the `branchName` field to `label` in `ProcessDurationItem` decouples the frontend from backend grouping details. It just renders whatever label the backend decided was appropriate (Branch or BMS Name).

## Verification

- Next.js compilation succeeds. 

## Remaining Work and Risks

- None. (If data is empty in frontend, it is correctly handled by the "Tidak ada keterlambatan signifikan" fallback which means no reports have completed the full cycle yet).
