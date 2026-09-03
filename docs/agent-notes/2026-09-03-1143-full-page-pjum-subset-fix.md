# Full Page PJUM Subset Fix

## Scope

Allow BMC to unselect new valid reports in the full-page PJUM flow while
keeping active laporan gantung mandatory and selected.

## Context and Sources

- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
- Task 3 review finding: full-page PJUM route still exported all eligible
  reports, blocking the user from reducing non-hanging reports under the
  Rp1,000,000 cap.

## Changed Files

- `app/reports/pjum/actions.ts`: allow selected eligible subsets while keeping
  mandatory hanging and expired-report guards.
- `app/reports/pjum/_components/pjum-view.tsx`: add selected report state,
  selected totals, and checkboxes for eligible reports.
- `lib/pjum-selection-policy.spec.ts`: assert `selectedCount`.

## Decisions

- Laporan gantung remains mandatory and cannot be removed.
- New valid non-hanging reports can be selected or unselected.
- PJUM total and create payload use selected reports, not all eligible reports.

## Verification

- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed with exit 0.

## Remaining Work and Risks

Task 4 still needs to add BNM hanging report visibility before approval.
