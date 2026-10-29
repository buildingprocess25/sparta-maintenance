# Preventive skip form state

## Scope

Client state for the preventive skip in the BMS report form: eligibility on store selection, effective skip flag, category visibility, step-1 validation, draft persistence/restore, and the revision page passing the report flag. No visible button yet (Task 5).

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 4)

## Changed Files

- `app/reports/(bms)/create/hooks/use-checklist.ts`: `skipPreventive`/`isSkipAllowed` state; `isPreventiveSkipped` and `canSkipPreventive` returned; skip treated as core + signage cooling for `filterActiveCategories` and `validateStep1`; skip reset on store change; eligibility fetched with `hasSkippedPreventiveThisQuarter`.
- `app/reports/(bms)/create/hooks/use-draft.ts`: `skipPreventive` in local and server draft payloads; restored after `handleStoreChange`.
- `app/reports/(bms)/create/create-form.tsx`: wiring; `isRepairOnlyMode` also true when skipped; skip toggle marks the server draft dirty.
- `app/reports/(bms)/revisi/[reportNumber]/page.tsx`: passes `preventiveSkipped` to the form.

## Decisions

- New reports: effective skip = requested && still eligible, so a draft resumed in month 2 falls back to the full checklist. Revisions: effective skip = report flag; the skip option is never offered there.
- Eligibility fetch failure disables the option (fail closed).

## Verification

- `preventive-visibility.spec.ts`, `draft-data.spec.ts`, `use-draft-source.spec.ts` → pass.
- `npx tsc --noEmit` → only `preventiveSkipped` Prisma errors (client not regenerated).

## Remaining Work and Risks

UI (Task 5), badge (Task 6), developer-run Prisma migration, manual browser check.
