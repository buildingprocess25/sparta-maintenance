# Signage "Tidak Ada" for Shop Sign and List Plank

## Scope

Adds the "Tidak Ada" option to signage items I11 (Kondisi Fisik Shop Sign) and I12 (Kondisi Fisik List Plank), matching I13 (Pole Sign). Materials, conditions, AHO ticket rules, and photo rules are unchanged.

## Context and Sources

- User request (2026-10-30).
- `docs/superpowers/specs/2026-10-26-signage-items-and-photo-guide-design.md` (originally "Tidak Ada" was I13 only).

## Changed Files

- `lib/checklist-data.ts`: `allowNotAvailable: true` on I11 and I12.
- `app/reports/actions/types.spec.ts`: "Tidak Ada" is now valid for I11–I13.
- `lib/signage.spec.ts`: config asserts `allowNotAvailable` on I11–I13.

## Decisions

- Only the catalog flag changes. The form option list, server validation (`buildDraftDataSchema`), JSON mapping, PDF, detail views, and signage export already read `allowNotAvailable` or `TIDAK_ADA` generically.

## Verification

- `types.spec.ts`, `signage.spec.ts`, `signage-checklist.spec.ts`, `signage-export.spec.ts` → pass.
- `npx tsc --noEmit` → no errors outside `.next/`.
- `app/dashboard/preventive/preventive-payload.spec.ts` fails with a trailing-whitespace assertion on HEAD too; unrelated.
- Not checked in the browser.

## Remaining Work and Risks

Manual check in the BMS form that I11 and I12 show "Tidak Ada" and that picking it clears the photo requirement.
