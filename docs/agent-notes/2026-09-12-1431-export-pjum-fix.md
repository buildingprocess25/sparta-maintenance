# Fix Export PJUM Column and Filter

## Scope

- Added "Status PJUM" column to export Excel output.
- Fixed Prisma `pjumExportedAt` null checking to use `{ equals: null }` for safer execution.

## Context and Sources

User reported manual testing failed with the filter and noticed the Excel export didn't include a column for the PJUM status itself.

## Changed Files

- `app/api/admin/export/route.ts`: added `Status PJUM` header and mapped the value based on `pjumExportedAt`.
- `app/admin/export/queries.ts`: adjusted the where condition for "BELUM" to `where.pjumExportedAt = { equals: null };`.

## Decisions

- The "Status PJUM" column is positioned right before the "Tanggal PJUM" column for logical grouping.

## Verification

Prisma compiler checks passed (via tsc earlier).

## Remaining Work and Risks

None
