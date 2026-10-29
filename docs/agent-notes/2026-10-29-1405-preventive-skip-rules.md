# Preventive skip rules

## Scope

Adds the pure eligibility rules for skipping the preventive checklist (first month of the quarter, WIB; once per store per quarter; not when the store already has preventive this quarter). No UI, DB, or server wiring yet.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 1)

## Changed Files

- `lib/preventive-skip.ts`: `isFirstMonthOfJakartaQuarter`, `getPreventiveSkipBlocker`, `canSkipPreventive`, `PREVENTIVE_SKIPPED_ACTIVITY_NOTE`.
- `lib/preventive-skip.spec.ts`: month boundaries (incl. 31 Oct 23:59 vs 1 Nov 00:00 WIB) and eligibility combinations.

## Decisions

- Revision mode exclusion stays in the client, not in the pure rule, so the server can reuse the rule unchanged.

## Verification

- `npx tsx lib/preventive-skip.spec.ts` → failed before implementation (module missing), then `preventive skip tests passed`.

## Remaining Work and Risks

Tasks 2–7 of the plan.
