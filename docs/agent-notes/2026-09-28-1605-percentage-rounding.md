# Percentage Rounding Fix

## Scope

Fix the misleading percentage rounding across the preventive dashboard so that 100% strictly indicates all items are complete, and 0% strictly indicates no items are complete.

## Context and Sources

- `app/dashboard/preventive/actions.ts`: Used `Math.round` extensively for calculating completion percentages.
- For branches with near-complete coverage (e.g., 490/491), `Math.round` would evaluate to 100%, causing user confusion.

## Changed Files

- `app/dashboard/preventive/actions.ts`: 
  - Updated the `calculateRate` function to cap values at 99% if `completed < total`, and floor at 1% if `completed > 0`.
  - Refactored 5 inline `Math.round` percentage calculations to instead call `calculateRate`.
- `docs/superpowers/specs/2026-09-28-percentage-rounding-design.md`: Added design spec.
- `docs/superpowers/plans/2026-09-28-percentage-rounding-plan.md`: Added implementation plan.

## Decisions

- Decided to centralize percentage logic in `calculateRate` rather than keeping duplicated inline `Math.round` calls, ensuring consistent behavior across the widget, table coverage, and historical trends.

## Verification

- The TypeScript compilation checked during editing.
- The single file modification correctly encapsulates all required fixes without altering function signatures.

## Remaining Work and Risks

None.
