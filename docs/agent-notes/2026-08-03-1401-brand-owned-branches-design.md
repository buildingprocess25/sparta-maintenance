# Design Brand-Owned Branches

## Scope

Documents the approved rule for filtering ADMIN dashboard branch views by
Brand. No application code, schema, migration, or production data changes.

## Context and Sources

- User-approved design discussion on 2026-08-03.
- `docs/agent-notes/2026-08-02-0900-fix-brand-filter-review.md`
- Existing `getStoreBrandWhere()` usage in dashboard and branch queries.

## Changed Files

- `docs/superpowers/specs/2026-08-03-brand-owned-branches-design.md`: approved
  behavior and verification criteria.

## Decisions

- A Brand owns a branch when the branch has at least one active store in that
  Brand.
- Alfamart is red and Lawson is blue in breakdown labels.
- BMC/BNM scope remains unchanged.

## Verification

- Reviewed the existing dashboard, realisasi, branch, and store-brand query
  paths.

## Remaining Work and Risks

Implementation plan and code changes are deferred until the user reviews the
committed design document.
