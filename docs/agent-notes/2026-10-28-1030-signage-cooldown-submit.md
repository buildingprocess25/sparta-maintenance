# Separate signage cooldown on submit

## Scope

Task 3 of `docs/superpowers/plans/2026-10-28-signage-revisions.md`: server-side
quarterly cooldown per item group (I1–I10 vs I11–I13) during report submit.
The form-side visibility comes in Task 4.

## Context and Sources

- Spec section "Revisi 2026-10-28" (R2).
- Previous behavior: `submit.ts` stripped every category-I item when the store
  had a complete I1–I10 report this quarter.

## Changed Files

- `lib/preventive-cooldown.ts` (+ spec): `resolvePreventiveSubmission()` strips
  items of groups in cooldown and requires the visible groups.
- `lib/report-preventive-sql.ts`: shared evidence SQL; new
  `completeSignageEvidenceSql()`.
- `app/reports/actions/queries.ts`, `app/reports/actions.ts`: new
  `getLastSignageDate()` server action.
- `app/reports/actions/submit.ts`: uses both cooldowns and the pure helper.

## Decisions

- Core done + signage not done → I11–I13 are required once in that quarter.
- KPI/matrix/export still use the I1–I10 completeness rule.

## Verification

- `lib/preventive-cooldown.spec.ts`: failed before, passes after.
- `submit-draft-source.spec.ts`, `report-preventive.spec.ts`: pass.
- `npx tsc --noEmit`: no errors outside `.next/`.

## Remaining Work and Risks

- SQL path not yet run against a database in this task (checked in Task 6).
