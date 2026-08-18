# Unblock BMS guide tooltip above estimation dialog

## Scope

Allow the Joyride tooltip to receive Next clicks while the BMS estimation
dialog remains open, and open that dialog from the Tambah Estimasi guide step.
No database or migration work.

## Context and Sources

- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `node_modules/@radix-ui/react-dialog/dist/index.js`

## Changed Files

- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: make the
  dialog non-modal so Radix does not disable pointer events on the Joyride
  tooltip portal, restore a visual backdrop below the dialog, and listen for
  the tour's dialog-open event.
- `app/reports/(bms)/create/components/bms-report-tour.tsx`: open the dialog
  when Next advances past Tambah Estimasi.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`:
  cover the dialog mode required for tooltip clicks.

## Decisions

The dialog's overlay and explicit outside/Escape dismissal guards remain in
place, including the focus-based interaction path used by non-modal Radix
dialogs. Only Radix's global outside-pointer lock is removed, allowing the
existing guide overlay to control page interaction and the tooltip to receive
Next clicks. A separate z-40 backdrop restores the dialog's dimmed background
below its z-50 content and the z-80 tooltip. Because that overlay blocks the
Tambah Estimasi button, Next now opens the dialog directly before the tour
proceeds to its first field.

## Verification

- `npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'`
  passed.
- `git diff --check` passed.

## Remaining Work and Risks

Not committed by request. Manual browser validation is still needed.
