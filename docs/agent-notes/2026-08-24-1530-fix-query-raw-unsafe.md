# Fix Prisma Raw Query Invocation

## Scope

Fixed a bug in `getBmsPreventiveCoverage` where `completePreventiveEvidenceSql` was incorrectly passed as a string interpolation in a raw string, causing a Prisma client syntax error (`P2010`).

## Changed Files

- `app/dashboard/preventive/actions.ts`: Rewrote `getBmsPreventiveCoverage` to use `prisma.$queryRaw` with strictly typed `Prisma.Sql` and `Prisma.join` for predicates instead of `$queryRawUnsafe`.

## Decisions

- **Avoid $queryRawUnsafe with Prisma.Sql**: `completePreventiveEvidenceSql` returns a `Prisma.Sql` object. Interpolating it into a regular string using `${}` results in `[object Object]` which breaks the query. Switching to tagged template literals with `prisma.$queryRaw` ensures Prisma handles the parameterization and SQL construction correctly.

## Verification

- `npm run dev` compilation passes. The query now correctly accepts branch arrays and Prisma SQL segments.
