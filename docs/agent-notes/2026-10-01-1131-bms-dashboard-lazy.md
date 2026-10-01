# Refactor BMS Dashboard Lazy Loading

## Scope

Refactor `BmsDashboard` to use React Suspense and add `prefetch={false}`.

## Context and Sources

Executing the global dashboards lazy loading plan.

## Changed Files

- `app/dashboard/_components/bms-dashboard.tsx`: Extracted data fetching to `BmsDashboardContent`, wrapped it in `<Suspense>`, and updated the link to disable prefetch.

## Decisions

Applied the streaming architecture to unblock the initial mobile UI render.

## Verification

Will verify through build at the end.

## Remaining Work and Risks

None.
