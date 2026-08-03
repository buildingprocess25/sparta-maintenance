# Swap brand breakdown label colors

## Scope

Swaps the Tailwind text color classes for Alfamart and Lawson brand breakdown labels in `app/dashboard/_components/admin/admin-new-dashboard.tsx` so Alfamart is red (`text-red-600`) and Lawson is blue (`text-blue-600`). Intentionally outside scope: schema changes, backend logic changes.

## Context and Sources

- `.superpowers/sdd/task-3-brief.md`
- `docs/superpowers/plans/2026-08-03-brand-owned-branches.md`
- `app/dashboard/_components/admin/admin-new-dashboard.tsx`

## Changed Files

- `app/dashboard/_components/admin/admin-new-dashboard.tsx`: Swapped `text-blue-600` and `text-red-600` for Alfamart and Lawson labels.
- `app/dashboard/_components/admin/admin-trend-filter.test.ts`: Added unit test asserting Alfamart label is `text-red-600` and Lawson label is `text-blue-600`.

## Decisions

- Swapped Tailwind text color classes across all brand breakdown sections (`GroupedKpiCard` and `StatusDistributionKpis`).

## Verification

- `node --import tsx --test app/dashboard/_components/admin/admin-trend-filter.test.ts` (Failed RED when expected, passed GREEN after changes).
- `npx tsx lib/store-brand-filter.test.ts` (Passed).
- `npx eslint app/dashboard/_components/admin/admin-new-dashboard.tsx app/dashboard/_components/admin/admin-trend-filter.test.ts` (Clean, exited 0).
- `npx tsc --noEmit` (Clean, exited 0).

## Remaining Work and Risks

None
