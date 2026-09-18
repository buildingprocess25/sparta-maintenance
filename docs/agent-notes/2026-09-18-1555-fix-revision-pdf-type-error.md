# Fix Revision PDF Type Error

## Scope

Added the missing `approval` property in `app/dashboard/intervensi/revisi-laporan/actions.ts` when calling `generateRevisionPdf`. This fixes the TypeScript build failure caused by `RevisionPdfData` strictly requiring the `approval` object.

## Context and Sources

- Local build failure: `npm run build:memory` threw a TypeScript error on line 306 in `actions.ts`.
- `RevisionPdfData` in `lib/pdf/generate-revision-pdf.ts` requires `approval: { reportStatus, stamps }`.
- Modeled the stamp extraction after the logic found in `lib/pdf/report-pdf-builder.ts` but adjusted to fit `RevisionPdfData`'s specific shape.

## Changed Files

- `app/dashboard/intervensi/revisi-laporan/actions.ts`: Added logic to fetch report activities, map them to `stamps`, and pass the `approval` property to `generateRevisionPdf`.

## Decisions

- **Activity Filtering**: Filtered report activities for relevant approval actions (`ESTIMATION_APPROVED`, `WORK_APPROVED`, `FINAL_APPROVED_BNM`) to populate the stamps array for the revision PDF.
- **Timestamp Formatting**: Used `toLocaleDateString` directly with standard Indonesian locale and Asia/Jakarta timezone.

## Verification

- `npx cross-env NODE_OPTIONS=--max-old-space-size=8192 next build` ran successfully in the background and completed without TypeScript errors.

## Remaining Work and Risks

None
