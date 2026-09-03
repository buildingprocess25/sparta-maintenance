# Full-Page BMC PJUM Route Parity

## Scope

Applies the shared PJUM selection policy to the full-page BMC PJUM creation
route and UI. This enforces mandatory active laporan gantung inclusion and the
Rp1,000,000 selected-total cap for `/reports/pjum`.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-3-brief.md`
- `docs/superpowers/specs/2026-08-28-pjum-hanging-carryover-design.md`
- `docs/agent-notes/2026-09-03-1043-pjum-mandatory-hanging-limit.md`
- `docs/agent-notes/2026-09-03-1056-dashboard-bmc-pjum-enforcement.md`
- `docs/agent-notes/2026-09-03-1107-dashboard-pjum-review-fix.md`
- `lib/pjum-selection-policy.ts`
- `app/dashboard/pjum/actions.ts`

## Changed Files

- `app/reports/pjum/actions.ts`: imports the shared PJUM selection policy,
  rejects missing mandatory active hanging reports, and rejects selected PJUM
  totals above Rp1,000,000 before creating an export.
- `app/reports/pjum/_components/pjum-view.tsx`: evaluates the same policy for
  the full-page create view, disables export when the selected eligible total is
  over the cap, shows over-limit action-panel copy, and adds the requested
  over-limit toast guard.
- `.superpowers/sdd/task-3-report.md`: records the task result and verification.

## Decisions

- Active laporan gantung continues to use lifecycle fields through
  `isActivePjumHangingReport`, not old-date comparison.
- Mandatory hanging reports remain part of the selected total and do not bypass
  the Rp1,000,000 cap.
- Full-page PJUM now reuses the same shared helper as dashboard PJUM to avoid a
  second policy implementation.

## Verification

- `npx tsx lib/pjum-selection-policy.spec.ts` failed because the local Windows
  `npx` shim points to a missing global npm CLI.
- `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/pjum-selection-policy.spec.ts")'`
  passed and printed `PJUM selection policy assertions passed`.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false --incremental false`
  passed.
- `git -c safe.directory=D:/MAGANG-ALFA/sparta-maintenance diff --check -- app/reports/pjum/actions.ts app/reports/pjum/_components/pjum-view.tsx`
  passed.

## Remaining Work and Risks

None.
