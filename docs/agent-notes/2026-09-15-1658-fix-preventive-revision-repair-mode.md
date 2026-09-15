# Fix Missing Options in Preventive Report Revision

## Scope

Fixes an issue where the "Baik" and "Tidak Ada" options are incorrectly hidden when revising a preventive report. This bug trapped users because they could not change a condition back to "Baik" during an estimation/checklist revision.

## Context and Sources

- The user reported that when BMS revises an estimation (e.g. BMC rejected it because BMS marked "atap" as "tidak ada"), BMS cannot see the option "Baik".
- `isRepairOnlyMode` was derived directly from `isCategoryICoolingDown`.
- Since revising a just-submitted preventive report triggers the quarterly cooldown check, `isCategoryICoolingDown` evaluates to `true`, forcing the revision form into "Repair Only" mode.

## Changed Files

- `app/reports/(bms)/create/hooks/use-checklist.ts`: Exported `hasPreventiveItemsInChecklist` from the hook so the parent can distinguish between a preventive report and an incidental report.
- `app/reports/(bms)/create/create-form.tsx`: Updated `isRepairOnlyMode` logic to `isCategoryICoolingDown && (!isEditMode || !hasPreventiveItemsInChecklist)`. This explicitly exempts preventive report revisions from being treated as ad-hoc/repair-only reports.

## Decisions

- We tied the exemption to `hasPreventiveItemsInChecklist` because incidental reports (which should legitimately be restricted) intentionally exclude Category I items during creation. This provides a flawless mechanism to distinguish between the two types of reports during edit mode.

## Verification

- Logic verified via truth table analysis (Creation/Revision x Incidental/Preventive).
- TypeScript syntax confirmed.

## Remaining Work and Risks

None.
