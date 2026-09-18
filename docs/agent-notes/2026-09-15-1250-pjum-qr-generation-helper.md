# PJUM QR Generation Helper

## Scope

Adds Task 3 of the PJUM QR validator plan: a server-only QR PNG data URL helper
for later PDF form rendering and package stamping.

## Context and Sources

- Reviewed `AI_RULES.md`.
- Reviewed `.superpowers/sdd/task-3-brief.md`.
- Reviewed `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.
- Reviewed `docs/agent-notes/2026-09-15-1159-pjum-qr-validator-plan.md`.
- Reviewed `docs/agent-notes/2026-09-15-1220-pjum-verification-fields.md`.
- Reviewed `docs/agent-notes/2026-09-15-1235-pjum-public-validator-page.md`.
- Reviewed existing server-only spec shim pattern in
  `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts` and
  `app/reports/(bms)/create/hooks/use-draft-source.spec.ts`.

## Changed Files

- `package.json`: records `qrcode` and `@types/qrcode` dependencies installed
  before this task started.
- `package-lock.json`: records QR dependency tree installed before this task
  started.
- `lib/pdf/qr-code.ts`: adds `createQrPngDataUrl(text)` using `qrcode` with
  medium error correction, 192px width, and PDF-friendly black-on-white output.
- `lib/pdf/qr-code.spec.ts`: verifies QR generation returns a non-empty PNG data
  URL.
- `.superpowers/sdd/task-3-report.md`: records the SDD task report.

## Decisions

- Kept `import "server-only"` in the helper as required by the task brief.
- Used the repo's existing standalone-spec pattern to no-op `server-only` in
  `require.cache` before dynamically importing the helper.
- Wrapped the brief's top-level `await` in an async `main()` because this
  workspace's `tsx` transform reported top-level await is unsupported with CJS
  output before reaching the missing-helper RED state.

## Verification

- `node_modules\.bin\tsx.cmd lib\pdf\qr-code.spec.ts`: failed before loading
  the test with `uv_os_get_passwd returned ENOMEM`, matching the known local
  `tsx` issue.
- `node --require C:\Users\Rendi Elang\.codex\visualizations\2026\09\15\01a0a325-09a6-7383-b066-e21ab576250d\os-userinfo-patch.cjs --import tsx lib\pdf\qr-code.spec.ts`:
  failed during RED with `Cannot find module './qr-code'`.
- Same fallback test command after implementation: passed and printed
  `pjum qr generation passed`.

## Remaining Work and Risks

- Later PJUM QR validator tasks still need to render the QR on the PJUM form,
  stamp package pages, and wire generation into approval.
