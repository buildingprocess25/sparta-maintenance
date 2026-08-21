# Fix Missing PDF Revisi Button

## Scope

Added the missing "PDF Revisi" button to the report detail page so users can access the revised PDF document after an intervention. The fix is strictly a UI/rendering fix and does not alter the underlying intervention logic or database structures.

## Context and Sources

The user reported performing an intervention on a report, clicking "Simpan & Generate PDF", but being unable to find or access the newly generated PDF.
Analysis of `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts` revealed that `getFinalDriveDocuments` hardcoded only the original "Laporan Final PDF" and "PJUM Final PDF", ignoring the `revisedPdfDriveUrl` stored in the database.

## Changed Files

- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`: Modified `getFinalDriveDocuments` to conditionally include the "PDF Revisi" link if `report.revisedPdfDriveUrl` exists.
- `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`: Added special styling and an `AlertTriangle` icon for the "revised_report" document key to distinguish it visually.

## Decisions

- Handled styling at the component level (`report-header.tsx`) using an amber-colored outline to draw attention to the revised PDF without needing a new generic button variant.
- Re-used the existing `getFinalDriveDocuments` utility so that the button natively integrates into the existing button cluster at the top-right of the detail page.

## Verification

Manual verification logic validated by analyzing the mapped document rendering. The conditional check `if (revisedPdfUrl)` ensures it only appears for intervened reports.

## Remaining Work and Risks

None.
