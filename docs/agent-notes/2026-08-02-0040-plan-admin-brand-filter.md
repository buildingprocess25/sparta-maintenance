# Plan Admin Brand Filter

## Scope

Records the executable implementation plan for ADMIN brand filtering across the dashboard, maintenance reports, preventive monitoring, and their requested XLSX exports. No feature code or database data is changed by this task.

## Context and Sources

- `docs/superpowers/specs/2026-08-02-admin-brand-filter-design.md`
- `app/dashboard/queries.ts`
- `app/dashboard/reports/actions.ts`
- `app/dashboard/preventive/actions.ts`
- `app/admin/export/queries.ts`
- `prisma/schema.prisma`

## Changed Files

- `docs/superpowers/plans/2026-08-02-admin-brand-filter.md`: task-by-task implementation plan and validation checklist.

## Decisions

- `LAWSON` identifies Lawson; null, empty, and other Store brand values are treated as Alfamart.
- Brand controls are ADMIN-only for this delivery.
- No schema migration or database repair is required.

## Verification

- Reviewed the implementation plan against the approved design specification.
- `git diff --check` is pending after this note is added.

## Remaining Work and Risks

Implementation has not started. Dashboard brand-breakdown query cost must be checked with focused tests and local manual validation during implementation.
