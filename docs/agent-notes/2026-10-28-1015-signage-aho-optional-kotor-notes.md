# Signage AHO optional and Kotor notes (server)

## Scope

Task 2 of `docs/superpowers/plans/2026-10-28-signage-revisions.md`: server-side
validation and persistence. Form/UI changes come in later tasks.

## Context and Sources

- Spec section "Revisi 2026-10-28" (R1, R3).

## Changed Files

- `app/reports/actions/types.ts`: `buildDraftDataSchema` exported with
  `signageAhoRequired` option (default from `SIGNAGE_AHO_REQUIRED`); signage
  Pudar/Rusak no longer needs an AHO ticket unless the flag is on; signage
  Kotor now requires notes on submit/resubmit.
- `app/reports/actions/report-json-helpers.ts`: keep notes for signage Kotor.
- `lib/pdf/generate-report-pdf.ts`: show the notes row for signage Kotor.
- Specs: `types.spec.ts`, `report-json-helpers.spec.ts` (two old Kotor cases now
  carry notes).

## Decisions

- Non-signage damaged items still require an AHO ticket.
- Grouped-ticket conflict rules still apply to tickets that are filled in.

## Verification

- `types.spec.ts` and `report-json-helpers.spec.ts` failed before and pass after.
- `draft-autosave-schema.spec.ts`, `generate-report-pdf-gallery.spec.ts` pass.
- `npx tsc --noEmit`: no errors outside `.next/`.

## Remaining Work and Risks

Client validation and UI still require AHO until Tasks 4–5 land.
