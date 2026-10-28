# Signage AHO flag and note helpers

## Scope

Task 1 of `docs/superpowers/plans/2026-10-28-signage-revisions.md`: env flag
reader and pure signage helpers used by later tasks. No behavior is wired yet.

## Context and Sources

- Spec section "Revisi 2026-10-28" in
  `docs/superpowers/specs/2026-10-26-signage-items-and-photo-guide-design.md`.

## Changed Files

- `lib/signage-aho-flag.ts` (+ spec): `isSignageAhoRequired()` reads
  `SIGNAGE_AHO_REQUIRED` ("true" = required, default false).
- `lib/signage.ts` (+ spec): `SIGNAGE_ITEM_IDS`, `getSignageNotePlaceholder()`,
  `isSignageNoteRequired()`, `isAhoRequiredForItem()`.
- `.env.example`, `CLAUDE.md`: document the env variable.

## Decisions

- Plain server env (not `NEXT_PUBLIC_`) so changing it needs only a restart;
  pages pass the value to the form as a prop.

## Verification

- `npx tsx lib/signage-aho-flag.spec.ts`: passed (failed before implementation).
- `npx tsx lib/signage.spec.ts`: passed (failed before implementation).

## Remaining Work and Risks

Tasks 2–6 of the plan wire these helpers into validation and UI.
