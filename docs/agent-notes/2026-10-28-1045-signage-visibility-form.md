# Signage visibility and validation in the report form

## Scope

Task 4 of `docs/superpowers/plans/2026-10-28-signage-revisions.md`: which
category-I items the BMS form shows, and the related client validation.

## Context and Sources

- Spec section "Revisi 2026-10-28" (R1, R2, R3).

## Changed Files

- `app/reports/(bms)/create/hooks/preventive-visibility.ts` (+ spec):
  `filterActiveCategories()` hides I1–I10 and I11–I13 per their own quarterly
  cooldown; edit/revisi keeps a cooled-down group visible when the loaded
  report already contains it.
- `app/reports/(bms)/create/hooks/use-checklist.ts`: fetches both cooldowns,
  requires visible signage items in repair mode, requires notes for signage
  Kotor, and makes the AHO check follow `isAhoRequiredForItem()`;
  `hasPreventiveItemsInChecklist` now only looks at I1–I10.

## Decisions

- `useChecklist` takes the flag as a 4th argument (default false); the page
  passes the server-read value in Task 5.

## Verification

- `preventive-visibility.spec.ts`: failed before, passes after.
- `signage-checklist.spec.ts`: passes.
- `npx tsc --noEmit`: no errors outside `.next/`.
- ESLint on the hooks folder: only the pre-existing `set-state-in-effect`
  error on the `initialStoreCode` effect.

## Remaining Work and Risks

UI wiring of the flag, note placeholders, and repair-mode copy in Task 5.
