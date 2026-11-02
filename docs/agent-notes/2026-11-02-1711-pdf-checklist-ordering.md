# PDF checklist ordering

## Scope

Makes every PDF built by `generateReportPdf` and `generateReportPdfFull` (PJUM package, single report PDF, Laporan Lengkap, dev preview) render checklist categories, items, material estimations, and completion details in catalog order (A1 → A22 → B1 → … → I13). Stored JSONB order and PDFs already archived in Drive are out of scope.

## Context and Sources

- `docs/superpowers/specs/2026-11-02-pdf-checklist-ordering-design.md`
- `docs/superpowers/plans/2026-11-02-pdf-checklist-ordering.md`
- Root cause: `generateReportPdf` rendered `items`/`estimations` in raw JSONB order; `groupItemsByCategory` + `Object.entries` kept first-appearance order.
- Existing comparators `compareChecklistItemIds` / `compareChecklistItemsById` in `lib/checklist-data.ts` (already used by the report detail page and full-report photo pages, commit `81015b2`).

## Changed Files

- `lib/pdf/report-pdf-order.ts`: new pure `orderReportPdfContent` sorting `items` and `estimations` by catalog order (stable, non-mutating).
- `lib/pdf/report-pdf-order.spec.ts`: node:assert spec for item order (I2 before I11), estimation order with stable materials, no mutation, unknown IDs last.
- `lib/pdf/generate-report-pdf.ts`: `generateReportPdf` and `generateReportPdfFull` call `orderReportPdfContent` while building `normalizedData`.
- `app/api/preview-pdf/route.ts`: dev-only mock items/estimations deliberately out of order (B1, A2, A1) so the preview proves sorting.
- `docs/superpowers/specs/2026-11-02-pdf-checklist-ordering-design.md`: revision note adding `generateReportPdfFull` to scope.

## Decisions

- Sort once inside the PDF generators (approach A) instead of in each caller or at save time, so all callers are fixed in one place and old reports need no migration.
- Helper kept in its own module, free of `@react-pdf/renderer`, so the spec runs standalone.
- `generateReportPdfFull` was found during implementation to render the same unsorted checklist via `buildReportDocument`; included because the user chose "all PDFs".

## Verification

- `npx tsx lib/pdf/report-pdf-order.spec.ts` → fails before the helper exists, passes after.
- `npx tsx lib/pdf/generate-report-pdf-gallery.spec.ts` → pass.
- `npx tsc --noEmit -p .` → no errors; `npx eslint` on changed files → clean.
- Dev server: `/api/preview-pdf?mode=pending` and `?mode=completed` → 200 `application/pdf`. Extracted text shows A. Bagian Depan Bangunan (A1, A2) then B. Area Sales (B1), estimation rows 1 = A1, 2 = B1, despite mock input order B1, A2, A1.
- Not verified on a real PJUM export with production-like data.

## Remaining Work and Risks

PDFs already archived in Google Drive keep their old order until regenerated.
