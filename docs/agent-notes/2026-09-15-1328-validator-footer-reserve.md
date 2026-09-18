# Validator Footer Reserve

## Scope

Increase bottom padding in SPARTA-generated PDFs to reserve space for the QR stamp.

## Context and Sources

Implemented Task 7 from `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.

## Changed Files

- `lib/pdf/generate-pjum-pdf.ts`: set bottom padding to 58.
- `lib/pdf/generate-report-pdf.ts`: set bottom padding to 58.
- `lib/pdf/pdf-validator-footer-reserve.spec.ts`: test.

## Decisions

Using 58 points reserves enough safe space on the bottom left for the QR code to be stamped during approval generation.

## Verification

- `node --import tsx lib/pdf/pdf-validator-footer-reserve.spec.ts` passed.

## Remaining Work and Risks

- None.
