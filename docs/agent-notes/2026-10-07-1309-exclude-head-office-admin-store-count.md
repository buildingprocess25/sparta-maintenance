# Exclude Head Office Branch from Admin Command Center Store Count

## Scope

Exclude `EXCLUDED_ADMIN_BRANCH_NAME` from active store count (`totalStoreAlfamart` and `totalStoreLawson`) in `getAdminCommandCenterData`. Non-store/head office administrative branches are excluded from operational store counts.

## Context and Sources

- `app/dashboard/queries.ts`: `getAdminCommandCenterData`
- `lib/admin-branch-scope.ts`: `EXCLUDED_ADMIN_BRANCH_NAME`

## Changed Files

- `app/dashboard/queries.ts`: Add `NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME }` filter to `prisma.store.count` for both Alfamart and Lawson brands.

## Decisions

- Exclude head office branch so that admin command center total store metric accurately reflects retail store counts.

## Verification

- Type check / lint verification
- Pre-commit hook validation (`node scripts/check-agent-task-note.mjs`)

## Remaining Work and Risks

None
