# Render QR Validator on PJUM Form

## Scope

Add the optional public-validator QR block and human-readable code to the
special PJUM form PDF page. Package-page QR rendering remains separate.

## Context and Sources

Implemented from `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`,
following the existing `lib/pdf/generate-pjum-form-pdf.ts` layout.

## Changed Files

- `lib/pdf/generate-pjum-form-pdf.ts`: accepts verification data and renders a
  small right-aligned QR block below the attention text inside the form border.
- `lib/pdf/generate-pjum-form-pdf-qr.spec.ts`: source contract test for the QR
  interface and required copy.
- `scripts/test-pjum-form.ts`: includes a QR placeholder in the PDF smoke test.

## Decisions

The QR block is optional for backward compatibility and uses the approved
copy: `Scan untuk validasi` and `Kode: PJUM-XXXX`. It is right-aligned within
the attention column so it stays in the empty lower-right form area.

## Verification

- `node --import tsx lib/pdf/generate-pjum-form-pdf-qr.spec.ts`: passed.
- `node --import tsx scripts/test-pjum-form.ts` with local `server-only` and
  Windows `os.userInfo` test shims: passed; generated a 410702-byte PDF.

## Remaining Work and Risks

The package-level PDF renderer still needs to pass verification data to this
form renderer during approval flow integration.
