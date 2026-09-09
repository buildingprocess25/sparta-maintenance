# Fix Filter Persistence Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix filter persistence bugs in Reports and Preventive pages to ensure `fromDate`, `toDate`, `cabang`, and `brand` filters are properly persisted and loaded.

**Architecture:** 
1. For Reports: Pass `fromDate` and `toDate` through `page.tsx` down to `AdminReportsTable` and sync them to the URL in `pushFilterToUrl`.
2. For Preventive: Ensure `getAdminPreventive` in `page.tsx` receives the initial `brand` filter and calculates the correct `completion` status based on `activeTab`, instead of hardcoding it to `"completed"`.

**Tech Stack:** Next.js App Router, React

## Global Constraints

- Use Next.js `next/navigation`
- Do not change existing layout or UI logic

---

### Task 1: Fix Reports Date Filter Persistence

**Files:**
- Modify: `app/dashboard/reports/page.tsx`
- Modify: `app/dashboard/reports/_components/admin-reports-table.tsx`

**Interfaces:**
- Consumes: URL `searchParams` (`fromDate`, `toDate`)
- Produces: Correct initial filters for `AdminReportsTable`

- [ ] **Step 1: Update `page.tsx` to read and pass date search params**

In `app/dashboard/reports/page.tsx`, update `searchParams` type and read date params:

```typescript
type Props = {
    searchParams: Promise<{
        status?: string;
        pjumStatus?: string;
        branchName?: string;
        areaName?: string;
        scope?: string;
        sla?: string;
        review?: string;
        revision?: string;
        brand?: string;
        fromDate?: string;
        toDate?: string;
    }>;
};
```

Extract the date values and pass them to `getAdminReports` and `<AdminReportsTable />`:

```typescript
    const initialFromDate = params.fromDate?.trim() || undefined;
    const initialToDate = params.toDate?.trim() || undefined;

    const [branches, initialReports] = await Promise.all([
        scopedBranches === null ? fetchAllBranchNames() : scopedBranches,
        getAdminReports(null, 20, {
            status: initialStatus,
            scope: initialScope,
            pjumStatus: initialPjumStatus,
            branchName: initialBranchName,
            areaName: initialAreaName,
            brand: initialBrand,
            fromDate: initialFromDate,
            toDate: initialToDate,
        }),
    ]);
```

Update the return statement to pass the new props:

```typescript
            <AdminReportsTable
                initialData={initialReports.reports}
                initialNextCursor={initialReports.nextCursor}
                initialTotalCount={initialReports.totalCount}
                branches={branches}
                areaNames={areaOptions}
                initialStatus={initialStatus ?? "all"}
                initialScope={initialScope ?? "all"}
                initialPjumStatus={initialPjumStatus ?? "all"}
                initialBranchName={initialBranchName ?? "all"}
                initialAreaName={initialAreaName ?? "all"}
                initialBrand={initialBrand}
                initialFromDate={initialFromDate}
                initialToDate={initialToDate}
                showBrandFilter={isAdmin}
            />
```

- [ ] **Step 2: Update `AdminReportsTable` props**

In `app/dashboard/reports/_components/admin-reports-table.tsx`, update the props interface:

```typescript
    initialAreaName = "all",
    initialBrand = "ALL",
    initialFromDate,
    initialToDate,
    showBrandFilter = false,
}: {
    initialData: ReportItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    areaNames: string[];
    initialStatus?: string;
    initialScope?: string;
    initialPjumStatus?: string;
    initialBranchName?: string;
    initialAreaName?: string;
    initialBrand?: string;
    initialFromDate?: string;
    initialToDate?: string;
    showBrandFilter?: boolean;
}) {
```

- [ ] **Step 3: Update `activeFilters` initialization**

In `app/dashboard/reports/_components/admin-reports-table.tsx`:

```typescript
            showBrandFilter && normalizeStoreBrandFilter(initialBrand) !== "ALL"
                ? createFilter<string>("brand", "is", [normalizeStoreBrandFilter(initialBrand)])
                : null,
            initialFromDate
                ? createFilter<string>("fromDate", "is", [initialFromDate])
                : null,
            initialToDate
                ? createFilter<string>("toDate", "is", [initialToDate])
                : null,
        ].filter((filter): filter is Filter<string> => filter !== null),
```

- [ ] **Step 4: Push `fromDate` and `toDate` to URL**

In `app/dashboard/reports/_components/admin-reports-table.tsx`, update `pushFilterToUrl`:

```typescript
                const pjumFilter = String(getVal("pjumStatus"));
                const brandFilter = String(getVal("brand"));
                const fromDateFilter = String(getVal("fromDate"));
                const toDateFilter = String(getVal("toDate"));

                branch ? params.set("branchName", branch) : params.delete("branchName");
                area ? params.set("areaName", area) : params.delete("areaName");
                if (resolvedQuick === "all") {
                    statusFilter ? params.set("status", statusFilter) : params.delete("status");
                    pjumFilter ? params.set("pjumStatus", pjumFilter) : params.delete("pjumStatus");
                }
                brandFilter && brandFilter !== "ALL"
                    ? params.set("brand", brandFilter)
                    : params.delete("brand");
                fromDateFilter ? params.set("fromDate", fromDateFilter) : params.delete("fromDate");
                toDateFilter ? params.set("toDate", toDateFilter) : params.delete("toDate");

                router.replace(`/dashboard/reports?${params.toString()}`, {
                    scroll: false,
                });
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/reports/page.tsx app/dashboard/reports/_components/admin-reports-table.tsx
git commit -m "fix(reports): persist fromDate and toDate filters in URL"
```

---

### Task 2: Fix Preventive Initial Data Fetch

**Files:**
- Modify: `app/dashboard/preventive/page.tsx`

**Interfaces:**
- Consumes: Server component `searchParams`
- Produces: Correctly filtered `initialData` for the Preventive table

- [ ] **Step 1: Import helper**

In `app/dashboard/preventive/page.tsx`:

```typescript
import { getAdminPreventive, getPreventiveBranchOptions, getReportYears } from "./actions";
import { getPreventiveCompletionForTab } from "./preventive-dashboard";
import { AdminPreventiveTable } from "./_components/admin-preventive-table";
```

- [ ] **Step 2: Update `getAdminPreventive` arguments**

In `app/dashboard/preventive/page.tsx`, fix the data fetch:

```typescript
    const [branchOptions, years, initialData] = await Promise.all([
        isAdmin ? getPreventiveBranchOptions() : Promise.resolve([]),
        getReportYears(),
        getAdminPreventive(null, 20, {
            year: initialYear,
            branchName: initialBranch,
            brand: initialBrand !== "ALL" ? initialBrand : undefined,
            completion: getPreventiveCompletionForTab(initialTab),
            ...(initialQuarter ? { quarter: initialQuarter } : {}),
        }),
    ]);
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/preventive/page.tsx
git commit -m "fix(preventive): include brand and correct completion state in initial fetch"
```
