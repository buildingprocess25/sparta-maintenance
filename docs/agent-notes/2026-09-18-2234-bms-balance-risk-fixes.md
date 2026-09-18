# BMS Balance Risk Fixes

## Scope

Closed server-side enforcement gaps for BMS balance lock and estimation resubmit validation.

## Context and Sources

- `AI_RULES.md`
- `AI_CONTEXT.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/agent-notes/2026-09-07-1130-update-bms-balance-cutover.md`
- `docs/superpowers/plans/2026-09-18-bms-balance-risk-fixes.md`
- `app/reports/actions/start-work-with-photos.ts`
- `app/reports/actions/resubmit.ts`

## Changed Files

- `app/reports/actions/start-work-with-photos.ts`: Added PJUM lock guard before photo start-work can transition a report to `IN_PROGRESS`.
- `app/reports/actions/resubmit.ts`: Added balance validation and period attachment for estimation revision resubmits.
- `app/reports/actions/bms-balance-guards.spec.ts`: Added regression coverage for both server guards.
- `docs/agent-notes/2026-09-18-2221-bms-start-work-lock.md`: Recorded the start-work lock task.
- `docs/agent-notes/2026-09-18-2227-bms-resubmit-balance.md`: Recorded the resubmit balance validation task.

## Decisions

- Reused existing balance helpers instead of adding a new service.
- Limited resubmit balance validation to `ESTIMATION_REJECTED_REVISION` because `REVIEW_REJECTED_REVISION` resubmits work realization, not a new estimation reserve.
- Compared revised estimation against `availableBalance + previousEstimation` so the report's old reserve is not double-counted.

## Verification

- `node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts'); require('./lib/pjum-hanging.spec.ts'); require('./lib/bms-balance-calculation.spec.ts'); require('./lib/bms-active-report-blocker.spec.ts'); require('./lib/bms-cutover-audit.spec.ts'); require('./lib/pjum-selection-policy.spec.ts');"`: PASS.
- `npm run build`: FAILED before project build because the global Windows npm shim points to missing `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules/.bin/next.cmd build`: initially failed in sandbox because Google Fonts could not be fetched, then PASS after rerunning with escalation/network access.

## Remaining Work and Risks

- The global npm shim on this machine is broken; use local binaries or fix the npm installation for future `npm run ...` commands.
