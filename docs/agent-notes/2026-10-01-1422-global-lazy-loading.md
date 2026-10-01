---
description: "Implementation of global lazy loading and cache optimization for Admin Dashboard, Reports, and PJUM routes"
type: feature
---

# Global Lazy Loading & Cache Optimization

## 1. What was the goal?
The goal was to eliminate blocking page renders for the Admin Dashboard (`/dashboard`), Reports page (`/dashboard/reports`), and PJUM page (`/dashboard/pjum`) by extracting data fetching into `Suspense`-wrapped content components. Additionally, we cached the `getAdminRealisasiDetail` query.

## 2. What was changed?
- Created `AdminDashboardContent` and updated `app/dashboard/page.tsx` to wrap it in `<Suspense>` with `AdminDashboardSkeleton`.
- Wrapped `getAdminRealisasiDetail` with `unstable_cache` in `app/dashboard/queries.ts`.
- Created `AdminReportsContent` and `AdminReportsSkeleton`, refactored `app/dashboard/reports/page.tsx` to use Suspense.
- Created `AdminPjumContent` and `AdminPjumSkeleton`, refactored `app/dashboard/pjum/page.tsx` to use Suspense.

## 3. How to test or verify?
- Log in as ADMIN.
- Navigate to `/dashboard`, `/dashboard/reports`, and `/dashboard/pjum`.
- The shell and skeleton loaders should appear immediately, rather than blocking on a blank screen.
- Verify the Realisasi chart loads successfully and future reloads use the cache.
