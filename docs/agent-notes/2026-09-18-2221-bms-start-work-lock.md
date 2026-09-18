# BMS Start Work Lock Guard

## Scope

Added server-side PJUM lock enforcement to the photo-based BMS start-work action.

## Context and Sources

- `AI_RULES.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/superpowers/plans/2026-09-18-bms-balance-risk-fixes.md`
- `app/reports/actions/start-work.ts`
- `app/reports/actions/start-work-with-photos.ts`
- `lib/balance.ts`

## Changed Files

- `app/reports/actions/start-work-with-photos.ts`: Added `isBmsLockedByPjum` guard before allowing an approved report to transition to `IN_PROGRESS`.
- `app/reports/actions/bms-balance-guards.spec.ts`: Added focused regression assertions for the photo start-work lock guard.

## Decisions

- Reused the same lock helper and error wording pattern already used by the legacy `startWork` action.
- Kept the guard before the status transition path so a locked BMS cannot bypass PJUM lock through the photo flow used by the UI.

## Verification

- `node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"`: PASS.
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`: FAIL only on pre-existing `lib/pdf/generate-pjum-form-pdf-qr.spec.ts(8,74)` regex `/s` target issue after the new spec was adjusted.

## Remaining Work and Risks

- Continue with estimation resubmit balance validation.
