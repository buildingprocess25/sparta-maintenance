# Fix Preventive annual matrix loading

## Scope

Show a loading indicator in the annual matrix table immediately after a
Preventive tab change. No query, filter, schema, or production-data behavior
changes.

## Context and Sources

- `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- `app/dashboard/preventive/preventive-payload.spec.ts`
- `docs/project/05-routes-and-ui.md`

## Changed Files

- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: set the
  existing loading state before clearing rows on a tab change, and render the
  matrix loading row before its empty state.
- `app/dashboard/preventive/preventive-payload.spec.ts`: add source-level
  regression assertions for the immediate loading path.

## Decisions

Reuse the existing `isLoading` state and `Loader2` component instead of adding
a separate matrix-only loading state. This keeps the request flow unchanged
and prevents the misleading empty state during the existing debounce.

## Verification

- `app/dashboard/preventive/preventive-payload.spec.ts` passed.
- `app/dashboard/preventive/preventive-dashboard.spec.ts` passed.
- `git diff --check` passed.

## Remaining Work and Risks

Manual browser validation remains useful before production deployment. No
production data was queried or changed.
