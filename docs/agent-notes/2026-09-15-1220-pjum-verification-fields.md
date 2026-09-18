# PJUM Verification Fields

## Scope

Adds the first PJUM QR validator foundation: nullable unique verification
identity fields on `PjumExport`, the database migration for those fields, and
pure helpers for token/code generation, URL construction, display-code
formatting, and public verification status derivation.

## Context and Sources

- Reviewed `AI_RULES.md`.
- Reviewed `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.
- Reviewed `docs/agent-notes/2026-09-15-1159-pjum-qr-validator-plan.md`.
- Reviewed current `prisma/schema.prisma` `PjumExport` model.
- Followed `.superpowers/sdd/task-1-brief.md` as the task source of truth.

## Changed Files

- `prisma/schema.prisma`: added nullable unique `verificationToken` and
  `verificationCode` fields near existing PJUM PDF fields.
- `prisma/migrations/20260915121658_add_pjum_verification_fields/migration.sql`:
  adds verification columns and unique indexes.
- `lib/pjum-verification.ts`: added pure helper contract for PJUM validator
  identity, URL, display code, and public status.
- `lib/pjum-verification.spec.ts`: added focused helper assertions.
- `.superpowers/sdd/task-1-report.md`: task implementation report.

## Decisions

- Verification token uses 24 random bytes encoded as base64url, producing a
  URL-safe token of at least 32 characters.
- Human-readable verification code uses 4 random bytes encoded as uppercase
  hexadecimal for an 8-character code.
- `APP_BASE_URL` is preferred for implicit URL construction, with
  `NEXT_PUBLIC_APP_URL` as fallback.
- Approved PJUM records are only public-valid when approval timestamp,
  approver NIK, and final Drive URL are all present.

## Verification

- `node_modules\.bin\tsx.cmd lib\pjum-verification.spec.ts`: failed with
  `uv_os_get_passwd returned ENOMEM` before loading the test, matching the
  known local tsx issue from the task brief.
- `node --require C:\Users\Rendi Elang\.codex\visualizations\2026\09\15\01a0a325-09a6-7383-b066-e21ab576250d\os-userinfo-patch.cjs --import tsx lib\pjum-verification.spec.ts`:
  failed during RED with `Cannot find module './pjum-verification'`.
- Same fallback test command after implementation: passed and printed
  `pjum-verification helpers passed`.
- `npx prisma validate`: failed before Prisma launched because the local Windows
  `npx` shim points to missing
  `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npx-cli.js`.
- `node_modules\.bin\prisma.cmd validate`: passed; Prisma loaded
  `prisma.config.ts`, loaded `prisma\schema.prisma`, and reported the schema is
  valid.

## Remaining Work and Risks

- Later PJUM QR validator tasks still need to wire these fields into approval,
  PDF QR rendering, and the public validator route.
- The requested exact `npx prisma validate` command is blocked by the local
  missing global npm/npx installation, so local Prisma validation was run via the
  project binary instead.
