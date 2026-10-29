# Preventive skip data contract

## Scope

Adds the `Report.preventiveSkipped` column to the Prisma schema, the `skipPreventive` field to `DraftData` and its Zod schema, and the quota query `hasSkippedPreventiveThisQuarter`. No Prisma command was run.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 2)

## Changed Files

- `prisma/schema.prisma`: `preventiveSkipped Boolean @default(false)` on `Report`.
- `app/reports/actions/types.ts`: `DraftData.skipPreventive` and `skipPreventive: z.boolean().optional()` (Zod strips unknown keys otherwise).
- `app/reports/actions/types.spec.ts`: schema keeps `skipPreventive` for submit and autosave; non-boolean rejected.
- `app/reports/actions/queries.ts`: `hasSkippedPreventiveThisQuarter(storeCode)`.
- `app/reports/actions.ts`: re-export.

## Decisions

- Quota counts skip reports in the current WIB quarter whose status is not `DRAFT` or `ESTIMATION_REJECTED` (permanent rejection gives the quota back, per user review).
- The developer runs Prisma commands personally; the migration folder is not created by the agent.

## Verification

- `npx tsx app/reports/actions/types.spec.ts` → failed (`skipPreventive` undefined), then `report action type tests passed`.
- `npx tsc --noEmit` → only `'preventiveSkipped' does not exist in type 'ReportWhereInput'` in `queries.ts`, expected until the Prisma Client is regenerated.

## Remaining Work and Risks

- Developer must run `npx prisma migrate dev --name add_report_preventive_skipped` (see plan Task 7).
