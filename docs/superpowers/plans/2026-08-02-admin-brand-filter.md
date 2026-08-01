# Admin Brand Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let ADMIN view dashboard, maintenance reports, preventive monitoring, and their XLSX exports by Semua, Alfamart, or Lawson; show both brand breakdowns when dashboard filter is Semua.

**Architecture:** Brand remains a Store attribute. A small shared filter contract translates UI values into Store/Report Prisma predicates. Existing server queries receive that filter; existing client controls pass it. No data migration or schema change is needed.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, shadcn/ui, XLSX export.

## Global Constraints

- ADMIN only: BMC/BNM controls and scope remain unchanged.
- `Store.brand = "LAWSON"` means Lawson; null, empty, or another value is Alfamart.
- A selected brand excludes reports without a resolvable Store. Semua retains their current visibility.
- A mixed-brand PJUM is counted in both brand breakdowns; Semua remains one unique PJUM total.
- Add no schema migration, index, dependency, or new route.
- Preserve the current all-brand result and the existing export column layout.

---

## Task 1: Define and test the shared brand contract

**Files:**
- Create: `lib/store-brand-filter.ts`
- Create: `lib/store-brand-filter.test.ts`

- [ ] Write failing tests for normalization and Prisma predicates: Semua returns no predicate, Lawson matches `LAWSON` case-insensitively, and Alfamart includes null/empty/non-Lawson values.
- [ ] Run: `npx tsx lib/store-brand-filter.test.ts` and confirm it fails.
- [ ] Implement `StoreBrandFilter`, option labels, `normalizeStoreBrandFilter`, `getStoreBrandWhere`, and `getReportBrandWhere` using Prisma relation filters.
- [ ] Rerun the focused test; it must pass.
- [ ] Commit: `feat: add store brand filter`

## Task 2: Filter the ADMIN maintenance-report list server-side

**Files:**
- Modify: `app/dashboard/reports/actions.ts`
- Modify: `app/dashboard/reports/_components/admin-reports-table.tsx`

- [ ] Extend `AdminReportFilters` with the shared brand type and add a failing focused action test for a selected brand predicate if the existing action test seam supports it; otherwise extend the Task 1 predicate test to cover the Report relation shape.
- [ ] Add the shared report predicate to the one `AND` filter path used by report paging, counts, and required-unPJUM calculation.
- [ ] Add an ADMIN-only Brand select to the existing table filter model, defaulting to Semua, and pass it on initial, search, filter, and next-page fetches.
- [ ] Verify the client resets cursor/results on brand changes and search still operates across server-side pages.
- [ ] Run focused TypeScript/lint checks for the two files.
- [ ] Commit: `feat: filter reports by brand`

## Task 3: Add brand to maintenance-report XLSX export

**Files:**
- Modify: `app/dashboard/reports/_components/export-reports-dialog.tsx`
- Modify: `app/admin/export/queries.ts`
- Modify if type flow requires it: `app/api/admin/export/route.ts`

- [ ] Add the shared Brand select to the export dialog, default Semua, and include it in the submitted `ExportFilter`.
- [ ] Extend `ExportFilter` and apply the same report predicate inside `buildReportWhere`, so Report and Material sheets are both scoped consistently.
- [ ] Confirm PJUM export paths remain unchanged because they are not part of this request.
- [ ] Run the focused export query/type check.
- [ ] Commit: `feat: filter report export by brand`

## Task 4: Filter ADMIN preventive monitoring and preventive export

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- Modify: `app/dashboard/preventive/page.tsx`
- Modify: `app/dashboard/preventive/_components/export-preventive-dialog.tsx`
- Modify: `app/admin/export/queries.ts`

- [ ] Add `brand` to `AdminPreventiveFilters` and merge the shared Store predicate before the common preventive store set is calculated. This must cover KPI, completed/uncompleted tabs, annual matrix, branches, history, search, and pagination.
- [ ] Expose an ADMIN-only Brand control beside the existing branch/year/quarter controls; every fetch includes its value and resets cursor/data when it changes.
- [ ] Pass an explicit admin capability prop from the page so BMC/BNM do not receive a new control.
- [ ] Add the same Brand select to the preventive export dialog and apply the Store predicate to `fetchPreventiveExportRows`.
- [ ] Run focused preventive and export checks; manually confirm a brand switch changes all tab badges and rows together.
- [ ] Commit: `feat: filter preventive data by brand`

## Task 5: Make dashboard data brand-aware and return all-brand breakdowns

**Files:**
- Modify: `app/dashboard/queries.ts`
- Create or modify focused tests near dashboard query helpers

- [ ] Extend `getAdminCommandCenterData(period, brand)` and every report/store-backed dashboard helper it calls with the shared brand predicate: KPI, status/SLA distribution, realisasi, branch performance/trend, stuck reports, and PJUM summary.
- [ ] Keep activity/user-only data explicitly global because it has no Store relation; do not silently label it as brand-specific.
- [ ] Add `brandBreakdown` to the returned command-center data. When UI filter is Semua, return Alfamart and Lawson values for each displayed report-backed KPI/card; when one brand is selected, only its normal value is needed.
- [ ] Compute PJUM breakdown from linked report stores using distinct report numbers so a mixed-brand PJUM appears in both brand values but the existing Semua aggregate remains unique.
- [ ] Write focused tests for the brand predicates and mixed-brand PJUM aggregation seam, then run them.
- [ ] Commit: `feat: add dashboard brand breakdowns`

## Task 6: Add dashboard URL filter and render brand breakdowns

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/_components/admin/admin-new-dashboard.tsx`
- Modify: `app/dashboard/_components/admin/admin-trend-filter.tsx`

- [ ] Parse `searchParams.brand`, normalize it, and pass it into the ADMIN dashboard query/component.
- [ ] Extend the existing header filter component with Brand while preserving both `period` and `brand` query parameters on either change.
- [ ] In Semua, render compact `Alfamart` and `Lawson` breakdowns below each report-backed KPI and requested card without changing their primary total. In a specific brand view, show only the filtered value.
- [ ] Ensure Distribution Status, Realisasi, Performa Cabang, and Stuck Reports consume the same selected filter, not merely their displayed KPI.
- [ ] Run focused lint/type checks and manually reload copied URLs such as `/dashboard?period=ytd&brand=lawson`.
- [ ] Commit: `feat: add dashboard brand filter`

## Task 7: Final review and handoff

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-admin-brand-filter.md`
- Modify if required: permanent canonical documentation only when behavior decisions need recording beyond this plan/spec

- [ ] Review the diff against the approved design: all three choices, ADMIN-only controls, all preventative surfaces, both requested export dialogs, and all dashboard requested cards.
- [ ] Run `git diff --check`, each focused test, and the narrow lint/type commands used above. Do not claim a full build unless it finishes.
- [ ] Manually test one Alfamart store, one Lawson store, a null/empty brand store (must read Alfamart), and a report without Store (must remain only in Semua reports).
- [ ] Create the dated task note from the template with validation evidence, exclusions, and no production data.
- [ ] Commit: `feat: add admin brand filtering`

## Review Checklist

- [ ] No BMC/BNM interface or authorization behavior changed.
- [ ] No migration, database patch, or production command was run.
- [ ] Filter controls do not disappear selected query parameters.
- [ ] Excel output matches its selected brand and existing columns remain intact.
- [ ] Dashboard labels do not present global activity/user metrics as brand metrics.
