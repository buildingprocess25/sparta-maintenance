# Dashboard Global Lazy Loading & Cache Optimization Design

## Problem Statement
The current Admin Dashboard (`AdminDashboardV2`) and key sub-routes (`/dashboard/reports`, `/dashboard/pjum`) fetch expensive database queries directly within their top-level `page.tsx` server components. This architecture blocks the entire page render until all data is resolved, causing a blank screen and poor Time to First Byte (TTFB). Additionally, the `getAdminRealisasiDetail` query used by the Admin Dashboard is not cached, meaning it queries the database in real-time on every load.

## Goal
Implement non-blocking UI rendering (React Suspense + Skeletons) for the Admin Dashboard and all major sub-routes, and cache the Realisasi chart data to reduce database load.

## Proposed Architecture

### 1. Admin Dashboard (`app/dashboard/page.tsx`)
**Current:** `page.tsx` awaits `getAdminCommandCenterData` and `getAdminRealisasiDetail`, then renders `<AdminDashboardV2>`.
**Proposed:**
- Create a new wrapper component `AdminDashboardContent` that takes `{ user, period, brand }` props.
- Move the `await Promise.all(...)` data fetching into `AdminDashboardContent`.
- Update `app/dashboard/page.tsx` to render `<Suspense fallback={<AdminDashboardSkeleton />}><AdminDashboardContent ... /></Suspense>`.

### 2. Realisasi Query Cache (`app/dashboard/queries.ts`)
**Current:** `getAdminRealisasiDetail` queries Prisma directly.
**Proposed:**
- Wrap `getAdminRealisasiDetail` with `unstable_cache`.
- Cache key: `["admin-realisasi-detail"]`.
- Revalidate: 300 seconds.
- Tags: `["admin-dashboard", "realisasi"]`.

### 3. Reports Page (`app/dashboard/reports/page.tsx`)
**Current:** Awaits `getAdminReports` and `fetchAllBranchNames` before rendering the shell and table.
**Proposed:**
- Create `AdminReportsContent.tsx` to handle the data fetching and rendering of `AdminReportsTable`.
- Update `app/dashboard/reports/page.tsx` to render the `AdminDashboardShell` immediately, and place `<Suspense fallback={<AdminReportsSkeleton />}>` inside its content area.
- Create `AdminReportsSkeleton.tsx` for the loading state.

### 4. PJUM Page (`app/dashboard/pjum/page.tsx`)
**Current:** Awaits `getAdminPjum`, `getAdminBranchOptions`, and `getDashboardPjumBmsUsers` before rendering.
**Proposed:**
- Create `AdminPjumContent.tsx` to handle data fetching and rendering of `AdminPjumTable`.
- Update `app/dashboard/pjum/page.tsx` to render `AdminDashboardShell` immediately, and place `<Suspense fallback={<AdminPjumSkeleton />}>` inside its content area.
- Create `AdminPjumSkeleton.tsx` for the loading state.

## Considerations
- The shell (Sidebar, Header, Breadcrumbs) should render instantly. Only the table/chart content should be suspended.
- Filters (searchParams) must be passed down to the Content components.
- The `AdminDashboardSkeleton` already exists and can be reused.

## Success Criteria
- Opening `/dashboard` as ADMIN shows the skeleton immediately instead of a blank screen.
- Opening `/dashboard/reports` and `/dashboard/pjum` shows the shell and a table skeleton immediately.
- The `getAdminRealisasiDetail` query is cached for 5 minutes.
