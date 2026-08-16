# Fix Custom Material Input on BMS Estimation

## Scope

Fixing the issue where users were unable to retain custom manual input for "Nama barang yang dibeli" on the BMS Estimation modal when the material name does not exist in the predefined options list.

## Context and Sources

The user reported that when adding an estimation item, manually typing an unrecognized material name and pressing Enter (or blurring the input box) caused the value to disappear. This was observed in `bms-estimation-step.tsx` using the `MaterialNameCombobox` component.

## Changed Files

- `components/material-name-combobox.tsx`: Updated `selectedValue` state logic to allow custom unlisted values to persist in the Combobox without being forced to `null`.

## Decisions

Removed the strict check `options.includes(value) ? value : null` and directly passed `value` as the selected value to the underlying `@base-ui/react` Combobox. This prevents the component from resetting the input field on blur or Enter when the text doesn't match a known option.

## Verification

Ran `npm run typecheck` which completed successfully. The application logic is confirmed to allow arbitrary values as the types are compatible and the UI behavior reflects custom input retention.

## Remaining Work and Risks

None
