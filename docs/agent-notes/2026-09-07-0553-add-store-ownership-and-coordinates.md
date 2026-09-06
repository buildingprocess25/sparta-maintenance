# Add store ownership and coordinates

## Scope

Add latitude, longitude, and ownershipType to the Store model in Prisma schema to support geographic and franchise ownership data.

## Context and Sources

Prisma migration added in `prisma/migrations/20260904110427_add_store_ownership_and_coordinates/migration.sql`.

## Changed Files

- `prisma/migrations/20260904110427_add_store_ownership_and_coordinates/migration.sql`: Adds StoreOwnershipType enum, latitude, longitude, and ownershipType columns to Store table.

## Decisions

- Set ownershipType default to 'UNKNOWN' to handle existing data gracefully.

## Verification

Prisma migration file created and verified. 

## Remaining Work and Risks

None.
