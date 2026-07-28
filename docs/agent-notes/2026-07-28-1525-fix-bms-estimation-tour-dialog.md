# Fix BMS estimation tour dialog interaction

## Scope

Keep the BMS estimation dialog interactive while its guide is shown, and move
the guide from Tambah Barang to the first dialog field after the dialog opens.
No database or migration work.

## Context and Sources

- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- `components/ui/dialog.tsx`

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour.tsx`: advance after
  the dialog's first field becomes available.
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: make
  estimation guide steps non-blocking.
- `app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts`:
  cover both regression guards.

## Decisions

Joyride uses z-index 80 while the shadcn dialog and select use z-index 50, so
the guide overlay intercepted dialog clicks. Estimation steps now omit that
overlay; the existing tour target polling advances after Tambah Barang opens
the dialog instead of changing dialog state or adding a dependency.

## Verification

- `npx tsx 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'`
  failed before the implementation and passed after it.

## Remaining Work and Risks

Manual browser validation is still needed for the dialog and select interaction
on desktop and mobile viewports.
