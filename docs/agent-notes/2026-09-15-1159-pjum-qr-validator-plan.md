# PJUM QR Validator Plan

## Scope

Menyusun implementation plan untuk fitur QR validator dokumen PJUM. Belum ada perubahan kode runtime, schema, atau UI aplikasi.

## Context and Sources

- User menjelaskan masalah: masih banyak user membuat dan print form PJUM manual, lalu menyerahkannya ke finance.
- Diskusi desain menyepakati validator publik tanpa login, tombol PDF resmi public yang tetap mengarah ke Google Drive perusahaan, QR dan kode validasi di semua halaman, serta placement khusus pada form PJUM.
- Reviewed `AI_RULES.md`, `DESIGN.md`, `docs/project/04-workflows.md`, `docs/project/05-routes-and-ui.md`, `docs/project/07-integrations-and-env.md`, `lib/pdf/generate-pjum-form-pdf.ts`, `lib/pdf/generate-pjum-package-pdf.ts`, `app/reports/pjum/approval-actions.ts`, and `lib/google-drive/archive.ts`.

## Changed Files

- `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`: added task-by-task implementation plan covering verification fields, public validator page, QR generation, PDF stamping, approval wiring, footer reserve, docs, and verification.
- `docs/agent-notes/2026-09-15-1159-pjum-qr-validator-plan.md`: records this planning task.

## Decisions

- Use a long random URL token and a separate short printed validation code.
- Public validator metadata includes report numbers.
- PDF official button remains public but relies on company Drive permissions.
- Form PJUM QR copy is `Scan untuk validasi` with `Kode: PJUM-XXXX`.
- Other package pages use `Validasi dokumen SPARTA` with `PJUM-XXXX`.

## Verification

- Documentation-only change; no runtime tests were run.

## Remaining Work and Risks

- Implementation still needs to execute the saved plan.
- Finance must compare printed document metadata with the validator page; QR validity alone cannot prove a printed page was not manually altered.
