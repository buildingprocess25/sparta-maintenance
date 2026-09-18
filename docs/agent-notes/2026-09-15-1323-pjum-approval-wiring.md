# PJUM Approval Wiring

## Scope

Integrate the QR validator generation and embedding into the BNM approval action.

## Context and Sources

Implemented Task 6 from `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.

## Changed Files

- `app/reports/pjum/approval-actions.ts`: generate token/code, embed in PDF, and persist in DB.
- `app/reports/pjum/approval-verification.spec.ts`: contract test.

## Decisions

We inject verification data during the `generatePjumPackagePdf` call which cascades down into the fallback PJUM form generation and the package stamping logic.

## Verification

- `node --import tsx app/reports/pjum/approval-verification.spec.ts` passed.

## Remaining Work and Risks

- Footer reservation in SPARTA-generated PDFs.
