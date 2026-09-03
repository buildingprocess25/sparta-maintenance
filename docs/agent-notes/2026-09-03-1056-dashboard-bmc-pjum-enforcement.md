# Dashboard BMC PJUM Enforcement

## Scope

Applies the shared PJUM selection policy to the dashboard BMC PJUM create route
and create dialog. This requires active laporan gantung to remain selected,
blocks PJUM creation when mandatory hanging reports are missing, and enforces
the Rp1,000,000 selected-total cap.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-2-brief.md`
- `docs/superpowers/specs/2026-08-28-pjum-hanging-carryover-design.md`
- `docs/agent-notes/2026-09-03-1043-pjum-mandatory-hanging-limit.md`
- `docs/agent-notes/2026-08-28-1433-pjum-hanging-carryover.md`
- `docs/agent-notes/2026-08-24-1415-hanging-report-logic.md`
- `lib/pjum-selection-policy.ts`

## Changed Files

- `app/dashboard/pjum/actions.ts`: imports and evaluates the shared PJUM
  selection policy in `createDashboardPjum`, rejects missing active hanging
  reports and selected totals above Rp1,000,000, and uses lifecycle fields to
  identify selected hanging reports.
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: evaluates the same
  policy in the dialog, keeps hanging rows selected, prevents unselecting them,
  preserves mandatory hanging rows during select-all deselect, disables hanging
  row checkboxes, and shows the over-limit warning.
- `.superpowers/sdd/task-2-report.md`: records the task result and verification.

## Decisions

- Active laporan gantung is defined by `pjumHangingAt` set with
  `pjumExpiredAt` and `pjumExportedAt` both unset, matching the lifecycle rule
  rather than old `finishedAt` date comparison.
- Mandatory hanging reports are not exempt from the Rp1,000,000 cap.
- The dashboard dialog keeps selecting all valid rows after search, so active
  hanging rows are selected with current valid rows immediately.

## Verification

- `npx tsx lib/pjum-selection-policy.spec.ts` failed because the local Windows
  `npx` shim points to a missing global npm CLI.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed.

## Remaining Work and Risks

None.
