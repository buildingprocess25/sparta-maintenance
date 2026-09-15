# PDF Footer Overlap Fix

## Scope

Fixed overlapping footer on dense PDF pages. Changed `paddingBottom` from 92 to 112 and
`footer.alignItems` from `flex-start` to `center` in all three affected stylesheets
(`styles`, `docPhotoPageStyles` in generate-report-pdf.ts, and `s` in generate-revision-pdf.ts).

## Context and Sources

- User reported footer text and separator line overlapping page content on dense pages.
- Root cause: footer height ~82pt + bottom: 20 = 102pt from bottom, exceeding paddingBottom: 92.
- Fix: raise paddingBottom to 112 (10pt safety margin), align footer items center for visual polish.

## Changed Files

- `lib/pdf/generate-report-pdf.ts`: paddingBottom 92→112 in `styles.page` and
  `docPhotoPageStyles.page`; alignItems flex-start→center in `styles.footer` and
  `docPhotoPageStyles.footer`.
- `lib/pdf/generate-revision-pdf.ts`: paddingBottom 92→112 in `s.page`;
  alignItems flex-start→center in `s.footer`.

## Decisions

- Did not refactor into shared footer util to avoid risk mid-fix.
- paddingBottom 112 satisfies existing contract test regex `9[0-9]|1[0-9]{2}`.

## Verification

- Contract spec `pdf-validator-footer-reserve.spec.ts` passes.
- TypeScript `tsc --noEmit` check found some errors on `app/dashboard/intervensi/revisi-laporan/actions.ts` and `generate-pjum-form-pdf-qr.spec.ts` but they are unrelated to the CSS changes made in this plan.

## Remaining Work and Risks

None.
