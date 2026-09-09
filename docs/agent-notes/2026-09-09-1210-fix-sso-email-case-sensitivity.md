# Fix SSO Email Case Sensitivity

## Scope

Updated the SSO callback route to make the email lookup case-insensitive. This ensures that users can log in even if their email casing from the SSO provider differs from the local database.

## Context and Sources

- File: `app/auth/sso/callback/route.ts`

## Changed Files

- `app/auth/sso/callback/route.ts`: added `mode: "insensitive"` to Prisma email query.

## Decisions

Used Prisma's `equals` and `mode: "insensitive"` for the `email` search filter to safely look up emails regardless of casing.

## Verification

Will be verified by the user after manual push to production, as well as by running `npm run build` locally.

## Remaining Work and Risks

None.
