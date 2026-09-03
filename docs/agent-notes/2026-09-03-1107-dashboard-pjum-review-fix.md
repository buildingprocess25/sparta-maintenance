# Dashboard PJUM Review Fix

## Scope

Fixes review findings for the dashboard BMC PJUM create enforcement task only.
No BNM approval detail or list UI was implemented.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-2-brief.md`
- `.superpowers/sdd/task-2-report.md`
- `docs/agent-notes/2026-09-03-1056-dashboard-bmc-pjum-enforcement.md`
- `docs/agent-notes/2026-08-28-1433-pjum-hanging-carryover.md`
- `app/reports/pjum/actions.ts`
- `app/dashboard/pjum/actions.ts`

## Changed Files

- `app/dashboard/pjum/actions.ts`: includes `LOCKED_PJUM` balance periods in
  active hanging candidate lookup, rejects selected expired reports with a
  clear error, and excludes expired reports from the export marker update.
- `app/dashboard/pjum/actions.spec.ts`: adds focused regression assertions for
  the dashboard server action review findings.
- `.superpowers/sdd/task-2-report.md`: appends this review-fix result.
- `docs/agent-notes/2026-09-03-1107-dashboard-pjum-review-fix.md`: records the
  task note.

## Decisions

- Mirrored the full-page BMS PJUM active hanging lookup by requiring the
  related balance period to match the BMS NIK and have status `ACTIVE` or
  `LOCKED_PJUM`.
- Kept expired in-range reports visible to the server validation path so a
  forged expired selection returns a specific expired-report error before the
  generic invalid report handling.
- Added `pjumExpiredAt: null` to the transaction `updateMany` condition so an
  expired report cannot be marked exported if state changes after validation.

## Verification

- RED: dashboard PJUM action spec failed before the action fix on the
  `LOCKED_PJUM` candidate lookup assertion.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./app/dashboard/pjum/actions.spec.ts")'`
  passed and printed `dashboard PJUM action assertions passed`.
- `npx tsx lib/pjum-selection-policy.spec.ts` failed because the local Windows
  `npx` shim points to a missing global npm CLI.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed.

## Remaining Work and Risks

None.
