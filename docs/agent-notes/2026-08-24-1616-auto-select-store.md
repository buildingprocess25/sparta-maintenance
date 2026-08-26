# Auto-Select Store in Create Report Form

## Scope

- Updated the Create Report page to accept and process the `storeCode` search parameter.
- Updated the `<CreateReportForm>` and `useChecklist` hook to auto-select the specified store on initial mount.

## Decisions

- When a BMS user clicks "Buat Laporan Preventif" from the Coverage Dashboard, the URL appends `?storeCode=XYZ`. 
- By reading this parameter and passing it as `initialStoreCode` to the checklist logic, the form will automatically trigger a store selection on mount. This saves the user from having to manually find and tap the store again, fulfilling the user's request to "let the BMS user continue".

## Verification

- The `storeCode` param is passed down correctly and the `useEffect` reliably sets the selected store on the first step of the wizard.
