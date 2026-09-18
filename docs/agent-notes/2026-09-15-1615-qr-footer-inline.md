# Task Summary
QR Code overlap on PDF documents has been permanently fixed by moving the QR code generation out of a post-process `pdf-lib` stamp and directly embedding it as a native `react-pdf` Image component inside the footer layout of the respective PDF generators.

# Technical Details
- Changed `generate-pjum-pdf.ts`, `generate-report-pdf.ts`, and `generate-revision-pdf.ts` to receive `verification?: { qrDataUrl: string; displayCode: string }` and render a two-column footer.
- Raised `paddingBottom` to `92` across these generators to provide space for the larger footer without overlapping page content.
- Deprecated `stampPjumValidatorOnPackage` in `pjum-validator-stamp.ts` as a no-op stub since the orchestrator (`generate-pjum-package-pdf.ts`) now passes the verification config downstream.

# Verification
- `lib/pdf/pjum-validator-stamp.spec.ts` updated to check for `verification?` logic.
- `lib/pdf/pdf-validator-footer-reserve.spec.ts` updated to assert `paddingBottom >= 90`.
