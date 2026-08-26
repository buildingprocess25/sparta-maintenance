# Preventive Matrix Export Data

## Scope

Added the data-shaping foundation for the new preventive annual matrix XLSX export.

## Context and Sources

- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`
- `docs/superpowers/plans/2026-08-25-preventive-annual-matrix-export.md`
- `app/dashboard/preventive/actions.ts`
- `lib/report-preventive-sql.ts`
- `prisma/schema.prisma`

## Changed Files

- `app/dashboard/preventive/annual-matrix-export.ts`: Defines export filters, row/summary types, latest-report-per-quarter shaping, branch totals, and the server-side data fetch.
- `app/dashboard/preventive/annual-matrix-export.spec.ts`: Covers latest report selection, selected-quarter status filtering, null/zero nominal handling, and branch/grand totals.
- `docs/agent-notes/2026-08-25-2043-preventive-matrix-export-data.md`: Task note for this checkpoint.

## Decisions

- Kept the shaping helper importable in plain Node specs by dynamically importing server-only dependencies inside the async query function.
- Used the existing dashboard semantics: latest qualifying preventive report wins for each store-quarter.
- Treated `totalReal = null` as non-contributing to totals while preserving numeric zero.

## Verification

- `.\node_modules\.bin\tsx.cmd app/dashboard/preventive/annual-matrix-export.spec.ts` passed with `preventive annual matrix export assertions passed`.

## Remaining Work and Risks

- API route, UI dialog, full type-check, lint, and manual XLSX verification remain.
