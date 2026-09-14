# Fix PJUM PDF Renderer Production Crash

## Scope

Fixes production PJUM approval failures caused by React PDF renderer crashing with `Cannot read properties of undefined (reading 'S')`.

## Context and Sources

- User reported BNM cannot approve PJUM.
- Dokploy logs showed repeated `approvePjumExport` failures with the same React PDF reconciler stack.
- `next.config.ts` had `@react-pdf/renderer` inside `experimental.optimizePackageImports`.
- Reviewed `docs/superpowers/plans/2026-09-14-fix-pjum-approval-pdf-renderer.md`, `next.config.ts`, `app/reports/pjum/approval-actions.ts`, `lib/pdf/generate-pjum-package-pdf.ts`, and `package-lock.json`.

## Changed Files

- `next.config.ts`: externalized `@react-pdf/renderer` and removed it from optimized package imports.
- `next-config-pdf-runtime.spec.ts`: added config regression guard.
- `scripts/smoke-react-pdf-renderer.ts`: added minimal renderer smoke test.
- `package.json`: added `smoke:react-pdf` script.

## Decisions

- Keep PJUM approval strict: approval still fails if final PDF generation fails.
- Avoid optimizing `@react-pdf/renderer` because it owns React reconciler internals that are sensitive to production server bundling.
- The smoke script avoids top-level await because local `tsx` transforms this script with CJS output.

## Verification

- Initial `node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts` was blocked by local Node/Windows `uv_os_get_passwd returned ENOMEM`.
- Retried `tsx` checks with `NODE_OPTIONS='--require ./.superpowers/sdd/patch-os-userinfo.cjs --require ./.superpowers/sdd/tsx-bootstrap.cjs'`.
- `node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts`: failed before the config change with the expected assertion about `@react-pdf/renderer` in `experimental.optimizePackageImports`.
- `node_modules\.bin\tsx.cmd next-config-pdf-runtime.spec.ts`: PASS after the config change.
- `node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts`: PASS with `react-pdf-smoke-ok react=19.2.8 renderer=4.5.1 bytes=1561`.
- `npm run smoke:react-pdf`: blocked because global npm points to missing `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`.
- `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false` with `NODE_OPTIONS=--max-old-space-size=8192`: PASS.
- `node_modules\.bin\next.cmd build` with `NODE_OPTIONS=--max-old-space-size=8192`: failed because local network cannot fetch Google Fonts `Geist` and `Geist Mono` from `fonts.googleapis.com`.

## Remaining Work and Risks

- Deploy to Dokploy and smoke test a pending PJUM approval in production.
- Smoke test `/api/reports/1PP9-2609-001/pdf?fallback=1` or an equivalent completed PJUM report after deploy.
- Monitor Dokploy logs after deploy for any remaining `approvePjumExport` or `generatePdf` failures.
- Git commits could not be created in this sandbox because `.git/index.lock` could not be created due to permission denied.
