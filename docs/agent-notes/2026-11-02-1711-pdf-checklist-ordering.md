# PDF checklist ordering

## Scope

Makes every PDF built by `generateReportPdf` (PJUM package, single report PDF, dev preview) render checklist categories, items, material estimations, and completion details in catalog order (A1 → A22 → B1 → … → I13). Stored JSONB order and PDFs already archived in Drive are out of scope.

## Context and Sources

- `docs/superpowers/specs/2026-11-02-pdf-checklist-ordering-design.md`
- `docs/superpowers/plans/2026-11-02-pdf-checklist-ordering.md`
- Root cause: `generateReportPdf` rendered `items`/`estimations` in raw JSONB order; `groupItemsByCategory` + `Object.entries` kept first-appearance order.
- Existing comparators `compareChecklistItemIds` / `compareChecklistItemsById` in `lib/checklist-data.ts` (already used by the report detail page and full-report photo pages, commit `81015b2`).

## Changed Files

- `lib/pdf/report-pdf-order.ts`: new pure `orderReportPdfContent` sorting `items` and `estimations` by catalog order (stable, non-mutating).
- `lib/pdf/report-pdf-order.spec.ts`: node:assert spec for item order (I2 before I11), estimation order with stable materials, no mutation, unknown IDs last.

## Decisions

- Sort once inside `generateReportPdf` (approach A) instead of in each caller or at save time, so all callers are fixed in one place and old reports need no migration.
- Helper kept in its own module, free of `@react-pdf/renderer`, so the spec runs standalone.

## Verification

- `npx tsx lib/pdf/report-pdf-order.spec.ts` → fails before the helper exists, passes after.

## Remaining Work and Risks

Integrate the helper into `generateReportPdf` and verify the preview PDF in the browser.
