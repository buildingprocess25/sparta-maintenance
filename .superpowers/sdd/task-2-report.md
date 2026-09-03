# Task 2 Report: Dashboard BMC Create PJUM Enforcement

## Status

DONE

## Commit

- `1e09d59 feat: require hanging reports in pjum`

## Files Changed

- `app/dashboard/pjum/actions.ts`
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`
- `docs/agent-notes/2026-09-03-1056-dashboard-bmc-pjum-enforcement.md`
- `.superpowers/sdd/task-2-report.md`

## Implementation Summary

- Added `PJUM_SELECTION_LIMIT` and `evaluatePjumSelectionPolicy` to
  `createDashboardPjum`.
- Built policy rows from the dashboard PJUM candidate report set using
  lifecycle-based active hanging detection:
  `pjumHangingAt` set, `pjumExpiredAt` null, and `pjumExportedAt` null.
- Rejected create requests that omit mandatory active hanging reports with:
  `Laporan gantung <numbers> wajib masuk PJUM periode ini`.
- Rejected create requests whose selected total exceeds Rp1,000,000 with:
  `Total nominal laporan yang akan di-PJUM-kan tidak boleh lebih dari Rp 1.000.000`.
- Replaced the old `finishedAt < fromDate` hanging report selection with the
  lifecycle-field rule.
- Added client-side policy evaluation in the BMC dashboard PJUM create dialog.
- Kept the existing search behavior that auto-selects all valid rows, including
  active hanging rows.
- Blocked manual unselect of selected hanging rows with the required toast copy.
- Made select-all deselect preserve valid hanging rows.
- Disabled hanging row checkboxes while keeping them checked.
- Added the over-limit summary warning with the required copy and
  `PJUM_SELECTION_LIMIT` formatting.

## Verification

- `npx tsx lib/pjum-selection-policy.spec.ts`
  - Failed because this checkout's Windows `npx` shim points at
    `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npx-cli.js`,
    which does not exist.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  - Passed.
  - Output: `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  - Passed.

## Git Hygiene

- Existing unrelated `package-lock.json` modification was not staged.
- Existing untracked `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
  was not staged.
- `.superpowers/sdd/task-2-brief.md` was read but not staged or modified.

## Concerns

None.

---

## Review Fix Report

## Status

DONE

## Files Changed

- `app/dashboard/pjum/actions.ts`
- `app/dashboard/pjum/actions.spec.ts`
- `docs/agent-notes/2026-09-03-1107-dashboard-pjum-review-fix.md`
- `.superpowers/sdd/task-2-report.md`

## Implementation Summary

- Updated dashboard active hanging candidate lookup to include balance periods
  with status `ACTIVE` or `LOCKED_PJUM`, scoped to the selected BMS NIK.
- Added an explicit server-side `createDashboardPjum` rejection for selected
  reports with `pjumExpiredAt` set:
  `Laporan <number> sudah hangus dan tidak bisa masuk PJUM`.
- Added `pjumExpiredAt: null` to the transaction `updateMany` that marks
  selected reports exported, preventing expired reports from being updated if
  state changes after validation.
- Added a focused dashboard action regression spec for the reviewed server-side
  constraints.
- Did not implement or touch BNM approval detail/list UI.

## Verification

- RED: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./app/dashboard/pjum/actions.spec.ts")'`
  failed before the action fix on the `LOCKED_PJUM` active hanging lookup
  assertion.
- GREEN: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./app/dashboard/pjum/actions.spec.ts")'`
  passed and printed `dashboard PJUM action assertions passed`.
- `npx tsx lib/pjum-selection-policy.spec.ts` failed because the local Windows
  `npx` shim points to a missing global npm CLI.
- Local fallback:
  `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed.

## Git Hygiene

- Existing unrelated `package-lock.json` modification was not staged.
- Existing untracked `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
  was not staged.

## Concerns

None.
