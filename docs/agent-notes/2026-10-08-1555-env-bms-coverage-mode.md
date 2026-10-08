# Read BMS_STORE_COVERAGE_MODE Feature Flag from Environment Variables

## Scope

Update `lib/bms-coverage-config.ts` to read `BMS_STORE_COVERAGE_MODE` dynamically from `process.env` with a fallback to `"BRANCH_WIDE"`. Add configuration documentation in `.env.example`.

## Context and Sources

- `lib/bms-coverage-config.ts`
- `.env.example`

## Changed Files

- `lib/bms-coverage-config.ts`: Updated `BMS_STORE_COVERAGE_MODE` evaluation to parse `process.env.BMS_STORE_COVERAGE_MODE`.
- `.env.example`: Added documentation for `BMS_STORE_COVERAGE_MODE="BRANCH_WIDE"`.

## Decisions

- Allow environment variable override (`"ASSIGNED_ONLY"` vs `"BRANCH_WIDE"`).
- Maintain `"BRANCH_WIDE"` as default if env variable is omitted.

## Verification

- `npx tsc --noEmit` passed with exit code 0.

## Remaining Work and Risks

None.
