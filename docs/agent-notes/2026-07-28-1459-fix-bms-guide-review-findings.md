# Fix BMS guide review findings

## Scope

Repair the reviewed BMS input-tour lifecycle, stale assertion, lint failure,
conditional target wait, AHO copy, and whitespace. Report fields, dialogs,
validation, and server actions remain unchanged.

## Context and Sources

- `docs/superpowers/plans/2026-07-28-bms-input-guide-revision.md`
- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`
- Review evidence from `react-joyride` tooltip behavior and focused checks.

## Changed Files

- `app/reports/(bms)/create/components/bms-report-tour.tsx`: uses controlled,
  continuous Joyride steps and waits with no active overlay for conditional
  targets.
- `app/reports/(bms)/create/create-form.tsx`: remounts the tour per wizard
  step rather than resetting state from an effect.
- `app/reports/(bms)/create/components/bms-report-tour-steps.ts`: corrects the
  AHO ticket guide copy and removes whitespace errors.
- `app/reports/(bms)/create/components/*tour*.spec.ts`: replaces the removed
  API assertion and covers the corrected lifecycle contract.

## Decisions

- Use Joyride's controlled `stepIndex` with the complete current flow so its
  primary control emits Next and its progress/back controls remain valid.
- Keep the tour hidden while waiting for a conditional field or menu instead
  of expiring after five seconds or blocking form input.

## Verification

- Updated regression assertions failed before the fix and passed after it.
- All focused BMS tour assertions, focused ESLint, `tsc --noEmit`, and
  `git diff --check` exited 0.

## Remaining Work and Risks

- Live browser verification with a BMS account and a real draft/checklist is
  still recommended for the full conditional interaction path.
