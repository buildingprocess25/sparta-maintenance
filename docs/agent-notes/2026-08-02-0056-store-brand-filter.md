# Add Store Brand Filter Shared Contract

## Scope

Implement the shared types and Prisma query helper methods for brand filtering (Semua, Alfamart, Lawson). This is strictly for backend helper methods and filtering contracts, not UI implementation.

## Context and Sources

- `e:/APROJECT/sparta-maintenance/.superpowers/sdd/task-1-brief.md`
- `prisma/schema.prisma`

## Changed Files

- `lib/store-brand-filter.ts`: Implemented `StoreBrandFilter`, option labels, `normalizeStoreBrandFilter`, `getStoreBrandWhere`, and `getReportBrandWhere`.
- `lib/store-brand-filter.test.ts`: Added passing tests for normalization and Prisma predicates.

## Decisions

- Lawson matching is case-insensitive.
- Alfamart matching checks for `brand: null`, `brand: ''`, and anything that is not Lawson.
- Reports without a resolvable `Store` (where `storeCode` is null) are explicitly excluded when querying for Lawson or Alfamart using `storeCode: { not: null }`.
- 'ALL' returns no predicate (`undefined`).

## Verification

- Command: `npx tsx lib/store-brand-filter.test.ts`
- Passed successfully covering all edge cases.
- Command: `npx tsc --noEmit lib/store-brand-filter.ts`
- Verified valid TypeScript compatibility with Prisma types.

## Remaining Work and Risks

None
