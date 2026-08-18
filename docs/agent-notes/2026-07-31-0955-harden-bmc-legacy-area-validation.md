# Harden BMC Legacy Area Validation

## Scope

Replace the source-text-only server validation check with a behavioral assertion module, make the branch-scope merge self-test independent of local backup files, and remove trailing blank lines from the BMC legacy-area plan documents. No migration or database data is changed.

## Context and Sources

- `app/bmc/database/actions.ts`
- `app/bmc/database/store-area-options.ts`
- `app/bmc/database/store-area-contract.spec.ts`
- `scripts/merge-branch-scopes.ts`
- `docs/project/08-operations.md`
- Review finding that the previous contract test matched source text instead of testing validation behavior.

## Changed Files

- `app/bmc/database/store-area-validation.ts`: pure branch-area resolver used by the server action.
- `app/bmc/database/store-area-validation.spec.ts`: behavioral assertions for valid, empty, cross-branch, and preserved orphan areas.
- `app/bmc/database/actions.ts`: load area options from Prisma, then delegate resolution to the tested helper using an explicit success/error discriminant.
- `app/bmc/database/store-area-contract.spec.ts`: retain wiring assertions for the action and UI after the resolver extraction.
- `scripts/merge-branch-scopes.ts`: keep `--self-test` independent from `backup/user-area.csv`.
- `docs/agent-notes/2026-07-31-0851-plan-bmc-store-legacy-branch.md`: remove trailing blank line.
- `docs/superpowers/plans/2026-07-31-bmc-store-legacy-branch.md`: remove trailing blank line.
- `docs/agent-notes/2026-07-31-0955-harden-bmc-legacy-area-validation.md`: task record.

## Decisions

The database query stays inside the server action because it is the trust boundary. The pure resolver receives only the branch-scoped options and input value, so it can be tested without a database while the server action still independently loads the authoritative options. Its result has an explicit valid discriminant so TypeScript safely narrows the success and error paths.

The branch merge script still requires the backup CSV files for dry-run or `--execute`, because those files provide the approved area and user-scope mapping. Only its static `--self-test` is decoupled from those files.

## Verification

- Observed `npx tsx scripts/merge-branch-scopes.ts --self-test` fail before the fix because `backup/user-area.csv` is absent.
- Observed `npx tsx app/bmc/database/store-area-validation.spec.ts` fail before the resolver existed.
- `npx tsx app/bmc/database/store-area-validation.spec.ts` passed after the fix.
- `npx tsx scripts/merge-branch-scopes.ts --self-test` passed after the fix.
- Focused ESLint passed.

## Remaining Work and Risks

The production scope/data merge has not run. It requires the approved `backup/branch-area-backup.csv` and `backup/user-area.csv` files plus explicit authorization to run `npx tsx scripts/merge-branch-scopes.ts --execute`.
