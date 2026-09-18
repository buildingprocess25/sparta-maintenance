# BMS Cutover Dry Run Policy

## Scope

Updated BMS balance cutover policy and init script for the revised go-live rules, then ran audit and dry-run against the configured database.

## Context and Sources

- `AI_RULES.md`
- `docs/project/10-bms-weekly-balance.md`
- `scripts/init-bms-balance-periods.ts`
- `scripts/audit-bms-balance-cutover.ts`
- `lib/bms-active-report-blocker.ts`
- User decision: initial hanging report cutoff is 3 months behind 2026-09-18, active report blocker cutoff is 7 days behind 2026-09-18.

## Changed Files

- `lib/bms-balance-cutover-policy.ts`: Added explicit go-live reference date, initial hanging cutoff, active blocker cutoff, and pure candidate helper.
- `lib/bms-balance-cutover-policy.spec.ts`: Added focused assertions for the cutover dates and initial hanging candidate rules.
- `lib/bms-active-report-blocker.ts`: Reused the shared active blocker cutoff from the policy helper.
- `scripts/init-bms-balance-periods.ts`: Made init default to dry-run, added `--execute` for writes, links initial hanging reports with positive realization, and skips initial hanging setup for BMS with pending PJUM.
- `scripts/audit-bms-balance-cutover.ts`: Added read-only reporting for cutover dates and initial hanging candidates.
- `docs/project/10-bms-weekly-balance.md`: Documented the revised cutoff and dry-run/execute go-live policy.

## Decisions

- Initial hanging reports are completed, unexported, unexpired, unmarked reports with `finishedAt >= 2026-06-18T00:00:00+07:00` and positive `totalReal`.
- Active report blocker cutoff is `2026-09-11T00:00:00+07:00`.
- The init script does not initialize old hanging reports for BMS with `PENDING_APPROVAL` PJUM, because marking them as hanging before the pending PJUM approval could make them expire too early.
- The init script is dry-run by default to make audit-before-execute the safe path.

## Verification

- `node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/bms-balance-cutover-policy.spec.ts'); require('./lib/bms-active-report-blocker.spec.ts'); require('./lib/bms-cutover-audit.spec.ts');"`: PASS.
- Read-only audit with DB access: active BMS 436, pending PJUM without matching locked period 4, unlinked open reports 667, initial hanging candidates 300, total Rp54.424.687.
- Init dry-run with DB access: 436 BMS active, 4 `LOCKED_PJUM`, 432 `ACTIVE`, 663 active reports to link, 298 initial hanging reports to link, total Rp53.967.687, 4 pending PJUM warnings.
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`: FAIL only on pre-existing `lib/pdf/generate-pjum-form-pdf-qr.spec.ts(8,74)` regex `/s` target issue.

## Remaining Work and Risks

- Resolve or intentionally ignore the 4 pending PJUMs before running `--execute`; otherwise their initial hanging reports are skipped and need another dry-run/execute pass after pending PJUM is completed.
- Full TypeScript check still has a pre-existing PDF spec target issue unrelated to this cutover change.
