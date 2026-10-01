# Fix BMS Branch Filter

## Scope

Fixed the server action `fetchAdminRealisasiDetailAction` fetching data for all branches instead of scoping it to the user's branch for BMC/BNM users.

## Context and Sources

- `app/dashboard/actions.ts`
- User report about BMS users appearing from different branches.

## Changed Files

- `app/dashboard/actions.ts`: Added `getAuthUser` inside `fetchAdminRealisasiDetailAction` and passed `user.branchNames` to `getAdminRealisasiDetail` if the user is not an Admin.

## Decisions

- Client-side filtering via `useEffect` was overwriting the initial properly-scoped server-side data with global data because the Server Action was hardcoded to `undefined` for `branchScope`. Extracting the user on the server action securely resolves this.

## Verification

- Verified `fetchAdminRealisasiDetailAction` correctly falls back to `undefined` for `ADMIN` but uses `user.branchNames` otherwise.

## Remaining Work and Risks

None
