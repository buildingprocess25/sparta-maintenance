# PJUM Validator Stamp

## Scope

Stamp QR validator and validation code on all package pages except the PJUM form page.

## Context and Sources

Implemented Task 5 from `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.

## Changed Files

- `lib/pdf/pjum-validator-stamp.ts`: new helper to draw QR block on PDF package pages.
- `lib/pdf/pjum-validator-stamp.spec.ts`: contract test for stamp helper.
- `lib/pdf/generate-pjum-package-pdf.ts`: tracks skipped indexes for the form and stamps the validator block on package pages.

## Decisions

The form page receives its QR independently inside its content, so we skip it during package stamping.

## Verification

- `node --import tsx lib/pdf/pjum-validator-stamp.spec.ts` passed.

## Remaining Work and Risks

- Approval wiring is still remaining.
