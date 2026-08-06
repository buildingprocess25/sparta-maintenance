# Fix PJUM Month Dropdown & Overlap Tolerance

## Scope

Added a month dropdown to the PJUM creation form so BMCs can manually override the report month name, rather than relying on automatic date parsing from the fromDate. Also fixed the date range overlap validation to allow a 1-day tolerance (exclusive end date) and visually block overlapping dates in the calendar picker.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-08-06-pjum-month-dropdown.md`
- Tasks 1-6 implementation logs and subagent reviews.

## Changed Files

- `prisma/schema.prisma`: Added `monthName String?` to `PjumExport`.
- `app/reports/pjum/actions.ts`: Updated `exportPjum` to accept and persist `monthName`.
- `app/reports/pjum/_components/pjum-view.tsx`: Added Month Select dropdown, auto-fill logic, and updated `findOverlappingRange` and calendar blocking.
- `app/reports/pjum/approval-actions.ts`: Updated approval query to use DB `monthName`.
- `lib/pdf/generate-pjum-package-pdf.ts`: Updated fallback PDF data to prioritize DB `monthName`.

## Decisions

- Saved `monthName` in the database to ensure PDF consistency across regenerations, preventing issues when generating PDFs for cross-month boundary periods.
- Null fallback to `fromDate.toLocaleString()` added to ensure backward compatibility for old PJUM records.

## Verification

- Passed strict `tsc` checks.
- Code reviewed cleanly via independent task gates.
- Manual logic trace confirms end-to-end type safety for `monthName`.

## Remaining Work and Risks

None.
