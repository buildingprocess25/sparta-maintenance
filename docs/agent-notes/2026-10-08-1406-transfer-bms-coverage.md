# Create BMS Store Coverage Transfer Script

## Scope

Created a one-off standalone script `scripts/transfer-bms-store-coverage.ts` to transfer active store coverage assignments from one BMS user to another, specifically for moving assignments from BMS "muh.khasan muafa" (26056451) to "Mukhamad Nurul Muttaqin" (26093569).

## Context and Sources

- User requested a script to reassign stores without running it immediately.
- Existing assignment scripts like `assign-single-bms-stores.ts` were used as reference for Prisma usage and transaction handling.

## Changed Files

- `scripts/transfer-bms-store-coverage.ts`: New script created with a dry-run feature.
- `package.json`: Added `transfer:bms-coverage` and `transfer:bms-coverage:dry-run` script commands.

## Decisions

- Set default NIKs in the script for convenience based on the user's specific request.
- Added a `--dry-run` flag so the user can simulate the transfer without modifying the database.
- Uses `Prisma.$transaction` to ensure safe, atomic operations when deactivating old assignments and activating new ones.
- Match BMS not only by exact raw NIK, but also by padded NIK or partial name match to avoid simple typo/formatting issues.

## Verification

- Linted and visually verified the TypeScript code.
- Script not executed as per explicit user instructions ("jangan dulu dirun").

## Remaining Work and Risks

None. The user will run the script manually.
