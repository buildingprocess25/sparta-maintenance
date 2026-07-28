# Lock BMS estimation dialog during guide

## Scope

Keep the estimation dialog open while the BMS guide handles Next, and restore
the guide overlay so actions outside the active tooltip remain blocked. No
database or migration work.

## Context and Sources

- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `node_modules/@radix-ui/react-dialog/dist/index.js`
- `docs/agent-notes/2026-07-28-1525-fix-bms-estimation-tour-dialog.md`

## Changed Files

- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: prevent
  external pointer and Escape events from dismissing the dialog.
- `app/reports/(bms)/create/components/bms-report-tour.tsx`: remove automatic
  advance from the Tambah Barang step.
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: restore the
  estimation guide overlay.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`:
  cover the locked-dialog behavior.

## Decisions

Radix sees the Joyride tooltip portal as outside the modal, so Next emitted a
pointer-down-outside event that dismissed it. The dialog now prevents those
events and Escape dismissal. This supersedes the previous non-blocking,
auto-advance attempt; the tour once again controls progression with its own
buttons.

## Verification

- `npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'`
  failed before the change and passed after it.
- BMS guide regression suite, focused ESLint, and `npm run test:agent-note`
  passed.
- `npx tsc --noEmit` exceeded the local 60-second command limit without output.

## Remaining Work and Risks

Manual browser validation is still needed to confirm Next changes the tooltip
step without closing the dialog.
