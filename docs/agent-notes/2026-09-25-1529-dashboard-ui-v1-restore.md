# Restore Admin Dashboard UI to v1

## Scope

Restored the KPI cards and layout in the admin dashboard (`admin-dashboard-v2.tsx`) to exactly match the styling, sizes, and colors of the original version 1 design, while retaining the new componentized structure (`kpi-cards.tsx`, `leaderboard-list.tsx`).

## Context and Sources

- `admin-new-dashboard.tsx`: Reviewed the `GroupedKpiCard` component and `groupedKpiToneClass` object to extract the original DOM structure, typography sizes, and specific Tailwind color classes (e.g., `emerald-700`, `sky-700`).

## Changed Files

- `app/dashboard/_components/admin/admin-dashboard-v2.tsx`: Refactored layout to integrate modular components (`kpi-cards.tsx` and `leaderboard-list.tsx`).
- `app/dashboard/_components/admin/kpi-cards.tsx`: Built the KPI cards to match v1 specs (colors, fonts, sizes).
- `app/dashboard/_components/admin/leaderboard-list.tsx`: Created reusable component for lists.

## Decisions

- **Styling**: Copied the exact DOM structure from `GroupedKpiCard` rather than attempting to approximate it with Shadcn `Card` components, ensuring a 1:1 visual match.
- **Colors**: Hardcoded the precise Tailwind classes from the v1 palette (`emerald-700`, `sky-700`, `amber-700`, `red-700`) to address user feedback regarding the previous generic colors.

## Verification

- `tsc --noEmit`: Checked TypeScript compilation errors.
- Visual verification performed by the user on the live Next.js development server.

## Remaining Work and Risks

None.
