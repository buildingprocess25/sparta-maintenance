# Checklist good-condition standard data

## Scope

Add the FCKT "Catatan Kondisi Baik" text as `standard` on the 115 checklist
catalog items in categories A–H. Category I, item IDs, names, order, and other
fields are unchanged. No UI change in this task.

## Context and Sources

- `docs/superpowers/specs/2026-10-27-checklist-good-condition-standard-design.md`
- `docs/superpowers/plans/2026-10-27-checklist-good-condition-standard.md` (Task 1)
- Source workbook: `FCKT Draft_Rev_SAT_FRM_MED_001_Form Checklist Kondisi Toko_250925.xlsx`, Sheet2.

## Changed Files

- `lib/checklist-data.ts`: `ChecklistCatalogItem.standard?: string`; `standard` on every A–H item.
- `lib/checklist-standard.spec.ts`: completeness and mapping checks.

## Decisions

- Matched Sheet2 rows to catalog items by name, not by Sheet2 code (D codes
  shift after a duplicated D3, H order differs, B has an extra ATM row).
- Kept text as in the document except the "todak" typo and comma spacing.
- "Stop Kontak ATM" (Sheet2 B11) is not added to the catalog.

## Verification

- `npx tsx lib/checklist-standard.spec.ts`: RED before data, GREEN after.
- Diff check: stripping `standard` from the new file reproduces HEAD exactly.
- `lib/signage.spec.ts`, `lib/photo-guides.spec.ts`, `lib/report-preventive.spec.ts`: pass.
- `npx tsc --noEmit`: no errors outside `.next/`.

## Remaining Work and Risks

Task 2 renders the standard in `ChecklistStep`.
