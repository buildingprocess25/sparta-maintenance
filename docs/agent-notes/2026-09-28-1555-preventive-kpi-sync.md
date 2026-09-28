# Preventive KPI Sync

## Scope

Synchronize the data displayed in the Checklist Preventif KPI widget and the detailed Admin Preventive table by ensuring both components exclude inactive stores.

## Context and Sources

- `app/dashboard/preventive/actions.ts`: Contains both `getAdminPreventiveKpiData` and `getAdminPreventive`.
- Discrepancy observed between target store counts (e.g., Semarang: 490 vs 496).
- Identified that `getAdminPreventiveKpiData` used an `isActive: true` filter, while `getAdminPreventive` did not.

## Changed Files

- `app/dashboard/preventive/actions.ts`: Added `isActive: true` filter to the `getAdminPreventive` query.
- `docs/superpowers/specs/2026-09-28-preventive-kpi-sync-design.md`: Added design spec.
- `docs/superpowers/plans/2026-09-28-preventive-kpi-sync.md`: Added implementation plan.

## Decisions

- Decided to apply the `isActive: true` filter globally within `getAdminPreventive` so that the detailed table, history, and target calculation completely omit inactive stores, matching the KPI widget.

## Verification

- The TypeScript compilation checked via `npm run build` (or similar verification).
- Code changes visually validated to ensure they correctly propagate down to pagination, completion logic, and history tracking within the same action.

## Remaining Work and Risks

None.
