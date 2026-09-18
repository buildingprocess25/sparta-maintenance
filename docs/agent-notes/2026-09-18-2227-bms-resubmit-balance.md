# BMS Resubmit Balance Validation

## Scope

Added server-side balance validation for BMS estimation revision resubmits.

## Context and Sources

- `AI_RULES.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/superpowers/plans/2026-09-18-bms-balance-risk-fixes.md`
- `app/reports/actions/resubmit.ts`
- `lib/balance.ts`

## Changed Files

- `app/reports/actions/resubmit.ts`: Added BMS balance validation for `ESTIMATION_REJECTED_REVISION`, creates or reuses an active balance period when a balance-impacting report is resubmitted, and persists `balancePeriodId`.
- `app/reports/actions/bms-balance-guards.spec.ts`: Extended focused regression assertions for estimation resubmit balance enforcement.

## Decisions

- Validation uses `availableBalance + previousEstimation` so the report's old reserved estimate is added back before comparing the revised estimate. This prevents revised-down estimates from being incorrectly blocked.
- Validation is limited to `ESTIMATION_REJECTED_REVISION`; work review resubmits keep using the completion/realisasi path.

## Verification

- `node -e "process.geteuid=()=>1000; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./app/reports/actions/bms-balance-guards.spec.ts');"`: PASS.

## Remaining Work and Risks

- Full project typecheck still has a pre-existing `lib/pdf/generate-pjum-form-pdf-qr.spec.ts(8,74)` regex `/s` target issue.
