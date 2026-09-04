# Full PDF Photo Order Reset

## Scope

Fix "Laporan Lengkap PDF" checklist documentation ordering so photo tiles follow the same canonical checklist order as the dashboard, and document that cached full PDF Drive URLs can be cleared manually for regeneration.

Outside scope: deleting old Google Drive PDF files and changing the standard final approval PDF generator.

## Context and Sources

- User production screenshot showed full PDF documentation photos were complete but not ordered like the dashboard documentation tab.
- Reviewed `AI_RULES.md`, `docs/project/04-workflows.md`, `docs/project/05-routes-and-ui.md`, `docs/project/07-integrations-and-env.md`, `docs/project/08-operations.md`, and recent full PDF notes.
- Root cause: dashboard sorted report items before building documentation photos, while the full PDF gallery preserved raw `Report.items` JSON order.

## Changed Files

- `lib/checklist-data.ts`: Added shared canonical checklist item ordering helpers.
- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`: Reused shared checklist ordering helpers instead of private duplicate comparator code.
- `lib/pdf/checklist-photo-gallery.ts`: Sorted full PDF gallery input by canonical checklist order before flattening photo tiles.
- `lib/pdf/report-pdf-full-builder.ts`: Sorted extracted checklist photo groups before PDF generation.
- `lib/pdf/generate-report-pdf-gallery.spec.ts`: Added regression coverage for unordered checklist photo input.
- `app/api/dashboard/preventive/annual-matrix-export/format.ts`: Moved route helper out of the Next route module.
- `app/api/dashboard/preventive/annual-matrix-export/route.ts`: Kept route exports Next-compatible.
- `app/api/photos/upload/handler.ts`: Moved upload route handler factory out of the Next route module.
- `app/api/photos/upload/route.ts`: Reduced upload route to dependency wiring and `POST` export.
- `app/api/photos/upload/route.spec.ts`: Updated test import to the new handler module.

## Decisions

1. Checklist item order is now centralized in `lib/checklist-data.ts` using the canonical checklist array first, with natural item ID fallback for unknown IDs.
2. The full PDF gallery sorts before flattening so rows render left-to-right in checklist order (`A1`, `A2`, `A3`, and onward through `I`), skipping only items without photos.
3. Existing generated full PDFs can be invalidated manually by clearing `fullPdfDriveUrl`; old Drive files should not be deleted as part of this fix.
4. Build-blocking extra exports were moved out of App Router `route.ts` files because Next route modules may only export supported route fields and handlers.

## Verification

- `node_modules\.bin\tsx.cmd lib\pdf\generate-report-pdf-gallery.spec.ts`: PASS.
- `node_modules\.bin\tsx.cmd app\dashboard\reports\[reportNumber]\_lib\detail-data.spec.ts`: PASS.
- `node_modules\.bin\tsx.cmd app\dashboard\reports\detail-data-aho.spec.ts`: PASS.
- `node_modules\.bin\tsx.cmd app\api\photos\upload\route.spec.ts`: PASS.
- `node_modules\.bin\next.cmd build --webpack`: PASS.
- `node_modules\.bin\next.cmd build`: sandbox run failed on Google Fonts network access; escalated Turbopack run compiled but hit local worker OOM, so webpack build was used for full production verification.

## Remaining Work and Risks

- After deploying this fix to production, manually set `Report.fullPdfDriveUrl` to `NULL` for reports that already have a full PDF cache. The next click on "Siapkan Laporan Lengkap PDF" will generate the corrected PDF.
