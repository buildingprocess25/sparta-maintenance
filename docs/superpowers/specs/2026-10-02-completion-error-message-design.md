# Design: Fix Undefined Error Message on Completion Form

## Context
When a user submits a completion report (BMS user pressing "Kirim Hasil Pekerjaan"), the system attempts to upload the photos from IndexedDB to Google Drive. If the upload fails (e.g., due to network error or missing file in local storage), a toast error message is displayed:
`Gagal mengunggah foto sesudah untuk item undefined`

This happens because `item.itemName` is `undefined` in the `report` object for that specific item.

## Goal
Improve the UX by ensuring the error message displays the actual name of the item instead of "undefined", using existing fallback mechanisms. 

## Approach: Fallback Item Name Resolution
In `app/reports/[reportNumber]/completion/use-completion-work-form.ts`, inside the `handleSubmit` function where we iterate over `damagedItems`, we will define a fallback variable to resolve the item name before using it in the error message.

```typescript
const resolvedItemName = item.itemName || getChecklistItemMeta(item.itemId)?.itemName || item.itemId;
```

This variable will be used for two error messages:
1. Error uploading "after photos" (`Gagal mengunggah foto sesudah untuk item ${resolvedItemName}`)
2. Error uploading "receipt photos" (`Gagal mengunggah nota realisasi untuk item ${resolvedItemName}`)

## Trade-offs and Considerations
- **No auto-retry mechanism**: We decided against implementing automatic background retries for photo uploads at this stage to keep the scope small and focus solely on correcting the misleading text. The user will still need to manually retry submitting if a network error occurs.
- **Consistency**: This fallback matches the exact logic already used in the `validationErrors` block in the same file.

## Expected Outcome
If an upload fails, the user will now see: `Gagal mengunggah foto sesudah untuk item Saklar Panasonic` instead of `item undefined`.
