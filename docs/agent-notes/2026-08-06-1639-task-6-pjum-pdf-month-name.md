# Task 6: generate-pjum-package-pdf.ts — Gunakan monthName dari DB

## Scope

Updated `generatePjumPackagePdf` in `lib/pdf/generate-pjum-package-pdf.ts` to include `monthName` in the `prisma.pjumExport.findFirst` select query, save it to `pjumExportMonthName`, and prioritize it over the derived date string in `fallbackPjumData`.

## Context and Sources

- `d:\MAGANG-ALFA\sparta-maintenance\.superpowers\sdd\task-6-brief.md`
- `docs/superpowers/plans/2026-08-06-pjum-month-dropdown.md`
- `lib/pdf/generate-pjum-package-pdf.ts`

## Changed Files

- `lib/pdf/generate-pjum-package-pdf.ts`: Updated `pjumExport` select query to include `monthName`, saved `pjumExportMonthName` to variable, and updated `fallbackPjumData.monthName` with fallback to `params.from` / `reports[0].createdAt` date formatting for legacy records.

## Decisions

- Declared `pjumExportMonthName` in the function scope (outer scope of `if (params.requireExported)`) so that it can be safely referenced in `fallbackPjumData`.
- Maintained fallback `toLocaleString("id-ID", { month: "long", timeZone: JAKARTA_TIME_ZONE })` for legacy export records where `monthName` is null.

## Verification

- TypeScript build check: `$env:NODE_OPTIONS="--max-old-space-size=4096"; npx tsc --noEmit` passed with exit code 0.

## Remaining Work and Risks

None.
