# BMS Preventive Coverage Dashboard and Details

## Scope

Added a dashboard summary and a dedicated detail page for BMS users to easily track their preventive maintenance completion for the current quarter. Excluded any changes to Admin/BMC dashboards.

## Context and Sources

- Brainstorming session with user.
- Implementation plan: `docs/superpowers/plans/2026-08-24-bms-preventive-coverage.md`.
- Existing `getAdminPreventive` SQL query.

## Changed Files

- `app/dashboard/preventive/actions.ts`: Added `getBmsPreventiveCoverage` SQL logic.
- `app/dashboard/_components/bms-dashboard.tsx`: Integrated the new `BmsPreventiveCard`.
- `app/dashboard/_components/bms-preventive-card.tsx`: New progress card component.
- `app/dashboard/coverage/page.tsx`: New tabbed detail page for BMS coverage.

## Decisions

- **Progress Card**: Chose a circular progress card on the dashboard because it's prominent and motivates completion.
- **Tabbed View**: Used a "Belum/Sudah" tabbed view on the detail page to let users quickly focus on what is left.
- **Data Fetching**: Added a specific function for BMS in `preventive/actions.ts` since it already contains the quarter logic and SQL helpers.

## Verification

- Verified type checking via Next.js dev server. Code conforms to schema.
- Built responsive UI using standard Shadcn/Tailwind.

## Remaining Work and Risks

None.
