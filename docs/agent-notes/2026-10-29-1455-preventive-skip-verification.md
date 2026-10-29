# Preventive skip verification

## Scope

Pre-migration verification of the preventive skip feature, the canonical note in `CLAUDE.md`, and the Prisma steps the developer runs personally.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 7)
- Notes `2026-10-29-1405` through `2026-10-29-1450` (preventive-skip-*)

## Changed Files

- `CLAUDE.md`: Notes entry for the first-month preventive skip rule.

## Decisions

- The agent does not run Prisma commands (user decision); the migration is created by the developer.

## Verification

- Unit tests pass: `lib/preventive-skip.spec.ts`, `lib/preventive-cooldown.spec.ts`, `app/reports/actions/types.spec.ts`, `app/reports/(bms)/create/hooks/preventive-visibility.spec.ts`, `app/dashboard/reports/[reportNumber]/_lib/detail-data.spec.ts`.
- `npx tsc --noEmit` → only errors caused by the stale Prisma Client (`preventiveSkipped` unknown, plus cascading select types in `app/dashboard/reports/[reportNumber]/queries.ts` and `DraftRecord` arguments in `app/reports/actions/draft.ts`).
- Build and browser checks not run yet: both need the regenerated Prisma Client and the new column.

## Remaining Work and Risks

1. Developer: `npx prisma migrate dev --name add_report_preventive_skipped` on the dev database, then commit `prisma/migrations`.
2. Agent: rerun `npx tsc --noEmit` and `npm run build`.
3. Manual browser check per plan Task 7 Step 7.
4. Production: `npx prisma migrate deploy` before or with the deploy.
