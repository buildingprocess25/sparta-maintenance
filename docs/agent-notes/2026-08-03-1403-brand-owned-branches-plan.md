# Plan Brand-Owned Branches

## Scope

Creates the implementation plan for the approved ADMIN dashboard branch ownership revision. No application code, schema, migration, or production data changes.

## Context and Sources

- `docs/superpowers/specs/2026-08-03-brand-owned-branches-design.md`
- `app/dashboard/queries.ts`
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`
- `lib/store-brand-filter.ts`

## Changed Files

- `docs/superpowers/plans/2026-08-03-brand-owned-branches.md`: TDD execution steps and verification commands.

## Decisions

- One owned-branch set is fetched once per dashboard load and shared by the realisasi trend and branch-performance aggregation.
- Existing `getStoreBrandWhere()` remains the source of truth for ownership.

## Verification

- Plan checked against the approved design for color, data-rule, scope, and empty-set coverage.

## Remaining Work and Risks

Implementation is deferred until the user selects an execution mode.