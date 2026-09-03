# PJUM Mandatory Hanging Limit

## Scope

Mandatory active laporan gantung selection for BMC PJUM creation, Rp1,000,000
PJUM selected-total cap, and BNM review visibility for hanging reports.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-1-brief.md`
- `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
- `docs/superpowers/specs/2026-08-28-pjum-hanging-carryover-design.md`
- `docs/agent-notes/2026-08-28-1433-pjum-hanging-carryover.md`

## Changed Files

- `lib/pjum-selection-policy.ts`: adds the shared pure PJUM selection policy
  helper and Rp1,000,000 default selection limit.
- `lib/pjum-selection-policy.spec.ts`: covers mandatory active hanging report
  selection, missing mandatory reports, selected totals, and over-limit cases.
- `.superpowers/sdd/task-1-report.md`: records the Task 1 implementation and
  verification report.

## Decisions

- Laporan gantung remains defined by lifecycle fields, not by old completion date alone.
- Active hanging reports are mandatory but do not bypass the Rp1,000,000 PJUM total cap.
- Server actions enforce the same rules as the UI.

## Verification

- RED: `npx tsx lib/pjum-selection-policy.spec.ts` failed before loading the
  test because the local Windows `npx` shim points at a missing global npm CLI.
- RED fallback: `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false --esModuleInterop true lib/pjum-selection-policy.spec.ts`
  failed with `Cannot find module './pjum-selection-policy'`.
- GREEN: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- Focused type check: `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false --esModuleInterop true lib/pjum-selection-policy.spec.ts`
  passed.

## Remaining Work and Risks

Task 1 only adds the shared pure policy helper and focused test. Dashboard and
reports PJUM UI/action enforcement are deferred to later tasks. Plain `npx`
could not run in this shell because it resolves to a missing global npm CLI, and
`tsx.cmd` also hit a Node `os.userInfo()` ENOMEM issue; the spec was executed
with local `tsx` registration plus a `process.geteuid` shim.
