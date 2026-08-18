# Task 5: approval-actions.ts — Gunakan monthName dari DB

## Scope

Updated `approvePjumExport` in `app/reports/pjum/approval-actions.ts` to include `monthName` in the `prisma.pjumExport.findUnique` select query and prioritize `pjumExport.monthName` over `fromDate.toLocaleString()` when constructing `pjumFormData`.

## Context and Sources

- `d:\MAGANG-ALFA\sparta-maintenance\.superpowers\sdd\task-5-brief.md`
- `docs/superpowers/plans/2026-08-06-pjum-month-dropdown.md`
- `app/reports/pjum/approval-actions.ts`

## Changed Files

- `app/reports/pjum/approval-actions.ts`: Added `monthName` (and `pjumPdfPath`) to `select` query and updated `pjumFormData.monthName` with fallback to `fromDate` localization for backward compatibility.

## Decisions

- Included `pjumPdfPath` in `select` list alongside `monthName` to prevent TypeScript compilation errors when `pjumExport.pjumPdfPath` is referenced during cleanup.
- Maintained fallback to `fromDate.toLocaleString("id-ID", { month: "long", timeZone: JAKARTA_TIME_ZONE })` for legacy PJUM export records created before `monthName` column addition.

## Verification

- TypeScript build check: `npx tsc --noEmit`

## Remaining Work and Risks

None.
