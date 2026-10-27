# Checklist good-condition standard UI

## Scope

Render the catalog `standard` text under the item name on regular checklist
cards in the BMS form. Signage cards, category I, report detail pages, and PDF
are unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-10-27-checklist-good-condition-standard-design.md`
- `docs/superpowers/plans/2026-10-27-checklist-good-condition-standard.md` (Task 2)

## Changed Files

- `app/reports/(bms)/create/components/checklist-step.tsx`: "Standar baik: …"
  line after the item name, before `desc` and the photo-guide link.

## Decisions

- Always visible (not tied to the selected condition), small muted text, label
  in medium weight, per the agreed design.

## Verification

- `npx tsc --noEmit`: no errors outside `.next/`.
- `npx eslint` on the file: clean, same as HEAD.
- Browser check at 375px (local dev, BMS login): all 115 A–H cards show
  "Standar baik: …", no category I card does; Panel Listrik order is name →
  standard → "Lihat contoh foto" → condition buttons; buttons do not shift.

## Remaining Work and Risks

None.
