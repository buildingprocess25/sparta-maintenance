# Make PJUM Confirmation Checkbox Thicker

## Scope

Changed the styling of the confirmation checkbox in the "Buat PJUM" dialog to make it more noticeable.

## Context and Sources

User feedback indicated that some users missed the confirmation checkbox because its color/border was not distinct enough against the background.

## Changed Files

- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: Added thicker border and colors to the checkbox.

## Decisions

Added `border-2 border-amber-600` and checked state colors to make it stand out against the `amber-50` background.

## Verification

Code replaced directly as it is a minor UI styling fix.

## Remaining Work and Risks

None
