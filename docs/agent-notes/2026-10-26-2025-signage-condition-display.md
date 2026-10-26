# Signage condition display (Task 8)

## Scope

Show signage condition and material (e.g. "Rusak · Acrylic") via `describeSignageCondition` in report PDF table and photo tiles, dashboard detail, BMS detail, wizard review step and the preventive-photo export script. Other items' labels are unchanged (helper returns null, callers fall back). Manual PDF/browser verification is out of scope.

## Context and Sources

`.superpowers/sdd/signage-task-8-brief.md`; `lib/signage.ts`; `types/report.ts`.

## Changed Files

- `lib/pdf/generate-report-pdf.ts`: ItemRow condition text, tile badge label/colour, `ChecklistItemWithPhotos` fields.
- `lib/pdf/checklist-photo-gallery.ts`, `lib/pdf/report-pdf-full-builder.ts`: pass signage fields through to tiles.
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`: `getConditionMeta` signage branch.
- `app/reports/[reportNumber]/report-detail-view.tsx`: signage text under item name.
- `app/reports/(bms)/create/components/review-step.tsx`: `formatBrokenItemDetail`.
- `scripts/export-preventive-photos.ts`: signage label in `getConditionLabel`.

## Decisions

Signage takes precedence over legacy condition labels only when the helper returns non-null.

## Verification

Gallery spec passes; `tsc --noEmit` clean outside `.next/`; eslint 0 errors (3 pre-existing unused-var warnings).

## Remaining Work and Risks

Manual PDF/browser check (brief Step 8) pending.
