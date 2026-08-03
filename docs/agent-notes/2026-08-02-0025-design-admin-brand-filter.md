# Design Admin brand filter

## Scope

Record the approved design for ADMIN-only brand filtering and breakdowns across
the dashboard, Maintenance Reports, Preventive, and their XLSX exports. No
application code, schema, migration, or database data is changed.

## Context and Sources

- User-provided Admin dashboard, report, and Preventive screenshots.
- `prisma/schema.prisma`
- `scripts/patch-store-brand.ts`
- `app/dashboard/reports/actions.ts`
- `app/dashboard/preventive/actions.ts`
- `app/admin/export/queries.ts`

## Changed Files

- `docs/superpowers/specs/2026-08-02-admin-brand-filter-design.md`: approved
  feature design.

## Decisions

- `Store.brand` is the source of truth; null or empty values mean Alfamart and
  `LAWSON` means Lawson.
- The first release is ADMIN-only.
- Dashboard uses one global URL-backed brand filter.
- Mixed-brand PJUM documents participate in each applicable brand breakdown,
  while the global total remains unique.
- No migration or proactive index is required.

## Verification

- Reviewed current schema, existing Lawson patch script, dashboard/report/
  preventive code paths, and the export route.
- Self-reviewed the specification for scope, ambiguity, and consistency.

## Remaining Work and Risks

The implementation plan and code remain pending user review of the approved
specification.
