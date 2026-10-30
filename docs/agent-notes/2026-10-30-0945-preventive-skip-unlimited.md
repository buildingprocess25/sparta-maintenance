# Preventive skip without per-store limit

## Scope

Removes the once-per-store-per-quarter limit on skipping the preventive checklist. A BMS may now skip any number of times for the same store, as long as it is the first month of the Jakarta quarter and the store has no preventive record (I1–I10) this quarter. Revision behavior, the reviewer badge, and the `Report.preventiveSkipped` column are unchanged.

## Context and Sources

- User revision request (2026-10-30).
- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md` (revision note added).
- `docs/agent-notes/2026-10-29-1405-preventive-skip-rules.md`, `2026-10-29-1420-preventive-skip-server.md`.

## Changed Files

- `lib/preventive-skip.ts`: drops `alreadySkippedThisQuarter` from the input and its blocker.
- `lib/preventive-skip.spec.ts`: drops the quota cases.
- `app/reports/actions/queries.ts`, `app/reports/actions.ts`: removes `hasSkippedPreventiveThisQuarter`.
- `app/reports/actions/submit.ts`: skip check no longer queries the quota.
- `app/reports/(bms)/create/hooks/use-checklist.ts`: eligibility no longer fetches the quota.
- `app/reports/(bms)/create/components/checklist-step.tsx`: hint, skipped banner, and dialog copy no longer mention "sekali per toko"; banner and dialog say the checklist is mandatory again from month 2.
- `CLAUDE.md`: Notes entry updated.
- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`: revision note.

## Decisions

- No schema change: `preventiveSkipped` still labels reports for reviewers and keeps revisions in repair mode.

## Verification

- `preventive-skip.spec.ts`, `preventive-cooldown.spec.ts`, `types.spec.ts`, `preventive-visibility.spec.ts` → pass.
- `npx tsc --noEmit` → no errors outside `.next/`.
- Not checked in the browser.

## Remaining Work and Risks

Manual check of the skip flow, including submitting two skipped reports for the same store in the first month.
