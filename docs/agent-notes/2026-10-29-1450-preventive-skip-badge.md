# Preventive skip reviewer badge

## Scope

Shows a "Preventif dilewati" badge in the report detail header used by BMC, BNM, and Admin. The BMS detail view, report lists, and XLSX export are unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 6)

## Changed Files

- `app/dashboard/reports/[reportNumber]/_lib/detail-data.ts`: optional `preventiveSkipped` on `RawReportDetailInput`.
- `app/dashboard/reports/[reportNumber]/queries.ts`: selects and maps `preventiveSkipped`.
- `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`: amber outline badge with `CalendarX2` icon and explanatory title, right after the status badge.

## Decisions

- Field is optional so existing fixtures and other builders of `RawReportDetailInput` need no change.

## Verification

- `npx tsx "app/dashboard/reports/[reportNumber]/_lib/detail-data.spec.ts"` → pass.
- `npx tsc --noEmit` → `preventiveSkipped` Prisma errors plus cascading select-type errors in `queries.ts` (`activities`, `createdBy`, `logs`), all caused by the not-yet-regenerated Prisma Client.
- `npx eslint` on changed files → only the pre-existing unused `Images` import warning.

## Remaining Work and Risks

Developer-run Prisma migration, then full typecheck, build, and manual check (Task 7).
