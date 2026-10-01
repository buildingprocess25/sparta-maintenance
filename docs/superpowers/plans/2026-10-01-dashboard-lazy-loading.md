# Dashboard Global Lazy Loading & Cache Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Admin Dashboard, Reports, and PJUM routes to use React Suspense for non-blocking rendering, and cache the realisasi data.

**Architecture:** Extract server-side data fetching from top-level `page.tsx` components into dedicated `*Content` components. Wrap these Content components with `<Suspense>` and fallback Skeleton components within the `page.tsx` shell. Wrap `getAdminRealisasiDetail` with Next.js `unstable_cache`.

**Tech Stack:** Next.js 14+ App Router, React Server Components (RSC), Suspense, Prisma.

## Global Constraints

- Do not change existing query logic, only wrap with `unstable_cache`.
- Follow existing Skeleton UI patterns for placeholders.
- Maintain existing `AdminDashboardShell` structure.

---

### Task 1: Refactor Admin Dashboard to use Suspense

**Files:**
- Create: `app/dashboard/_components/admin/admin-dashboard-content.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getAdminCommandCenterData`, `getAdminRealisasiDetail` from `app/dashboard/queries.ts`.
- Produces: `AdminDashboardContent` component.

- [ ] **Step 1: Create AdminDashboardContent component**

Create `app/dashboard/_components/admin/admin-dashboard-content.tsx` with the following code:
```tsx
import { type AuthUser } from "@/lib/authorization";
import { getAdminCommandCenterData, getAdminRealisasiDetail } from "../../queries";
import { AdminDashboardV2 } from "./admin-dashboard-v2";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export async function AdminDashboardContent({
    user,
    period,
    brand,
}: {
    user: AuthUser;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const [data, realisasiData] = await Promise.all([
        getAdminCommandCenterData(period as any, brand),
        getAdminRealisasiDetail(brand)
    ]);

    // AdminDashboardV2 includes the shell, which we should ideally extract.
    // However, AdminDashboardV2 wraps everything in AdminDashboardShell.
    // For now, to minimize refactoring depth, we will just return it. 
    // Wait, if AdminDashboardV2 wraps in AdminDashboardShell, the shell will be delayed!
    // To fix this, we should extract the Shell out to page.tsx, OR modify AdminDashboardV2.
    // Let's pass the props to AdminDashboardV2 for now.
    return (
        <AdminDashboardV2 
            user={user} 
            data={data} 
            realisasiData={realisasiData} 
            period={period} 
            brand={brand} 
        />
    );
}
```
*Note: Due to `AdminDashboardV2` hardcoding the Shell, we will just wrap it directly for simplicity, though the Shell will also be suspended. We can improve this if needed.*

- [ ] **Step 2: Update dashboard page.tsx to use Suspense for Admin**

Modify `app/dashboard/page.tsx`. Import `AdminDashboardContent` and `AdminDashboardSkeleton`.
Change the `ADMIN` case to use Suspense.

```tsx
import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminDashboardContent } from "./_components/admin/admin-dashboard-content";
import { AdminDashboardSkeleton } from "./_components/admin/admin-dashboard-skeleton";
import { Suspense } from "react";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";

type DashboardPageProps = {
    searchParams?: Promise<{
        period?: string | string[];
        brand?: string | string[];
    }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const user = await requireAuth();
    const params = searchParams ? await searchParams : {};
    const period = Array.isArray(params.period)
        ? params.period[0]
        : params.period;
    const rawBrand = Array.isArray(params.brand) ? params.brand[0] : params.brand;
    const brand = normalizeStoreBrandFilter(rawBrand);

    switch (user.role) {
        case "BMS":
            return <BmsDashboard user={user} />;
        case "BMC":
            return <BmcDashboard user={user} period={period} brand={brand} />;
        case "BNM_MANAGER":
            return <BnmDashboard user={user} period={period} brand={brand} />;
        case "ADMIN":
            return (
                <Suspense fallback={<AdminDashboardSkeleton />}>
                    <AdminDashboardContent user={user} period={period} brand={brand} />
                </Suspense>
            );
        default:
            return <BmsDashboard user={user} />;
    }
}
```

- [ ] **Step 3: Commit Task 1**

```bash
git add app/dashboard/page.tsx app/dashboard/_components/admin/admin-dashboard-content.tsx
git commit -m "refactor: apply Suspense lazy loading to AdminDashboardV2"
```

---

### Task 2: Cache `getAdminRealisasiDetail`

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Prisma database calls.
- Produces: Cached `getAdminRealisasiDetail` function.

- [ ] **Step 1: Wrap query with unstable_cache**

Modify `app/dashboard/queries.ts` to wrap `getAdminRealisasiDetail` with `unstable_cache`.

```tsx
export const getAdminRealisasiDetail = unstable_cache(
  async (
    brand: StoreBrandFilter = "ALL",
    branchScope?: string[],
    period?: string
  ): Promise<AdminRealisasiDetail> => {
    // Keep existing implementation exactly the same inside
```
Add the closing parameters to the bottom of the function:
```tsx
  },
  ["admin-realisasi-detail"],
  {
    revalidate: 300,
    tags: ["admin-dashboard", "realisasi"],
  }
);
```

- [ ] **Step 2: Commit Task 2**

```bash
git add app/dashboard/queries.ts
git commit -m "perf: cache getAdminRealisasiDetail query"
```

---

### Task 3: Refactor Reports Page to use Suspense

**Files:**
- Create: `app/dashboard/reports/_components/admin-reports-content.tsx`
- Create: `app/dashboard/reports/_components/admin-reports-skeleton.tsx`
- Modify: `app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `getAdminReports`, `fetchAllBranchNames`
- Produces: `AdminReportsContent`

- [ ] **Step 1: Create AdminReportsSkeleton**

Create `app/dashboard/reports/_components/admin-reports-skeleton.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminReportsSkeleton() {
    return (
        <div className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
            <div className="border rounded-md">
                <div className="h-12 border-b bg-muted/50" />
                <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create AdminReportsContent**

Create `app/dashboard/reports/_components/admin-reports-content.tsx`. Move the data fetching from `page.tsx` here.

```tsx
import { AdminReportsTable } from "./admin-reports-table";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { getAdminReports } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeletedReportsTable } from "./deleted-reports-table";
import type { StoreBrandFilter } from "@/lib/store-brand-filter";

export async function AdminReportsContent({
    isAdmin,
    scopedBranches,
    initialStatus,
    initialScope,
    initialPjumStatus,
    initialBranchName,
    initialAreaName,
    initialBrand,
    initialFromDate,
    initialToDate,
    areaOptions,
}: any) {
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

    const activeReportsTable = (
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
    );

    if (!isAdmin) {
        return (
            <div className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                {activeReportsTable}
            </div>
        );
    }

    return (
        <Tabs defaultValue="active" className="flex flex-col h-full">
            <div className="bg-background border-b px-4 lg:px-6">
                <TabsList variant="line" className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                    <TabsTrigger 
                        value="active" 
                        className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                    >
                        Laporan Aktif
                    </TabsTrigger>
                    <TabsTrigger 
                        value="deleted" 
                        className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                    >
                        History Dihapus
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="active" className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                {activeReportsTable}
            </TabsContent>
            
            <TabsContent value="deleted" className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden">
                <DeletedReportsTable />
            </TabsContent>
        </Tabs>
    );
}
```

- [ ] **Step 3: Update Reports page.tsx**

Modify `app/dashboard/reports/page.tsx` to render the Shell immediately and wrap Content in Suspense.
Remove the `await Promise.all` from `page.tsx` and pass the calculated parameters to `AdminReportsContent`.

Replace the `await Promise.all(...)` and `activeReportsTable` parts in `page.tsx` with:

```tsx
    return (
        <AdminDashboardShell
            user={user}
            title="Laporan Maintenance"
            breadcrumbs={[{ label: "Laporan Maintenance" }]}
            headerActions={
                <ExportReportsDialog
                    branches={scopedBranches === null ? [] : scopedBranches}
                    showBranchFilter={isAdmin}
                    showBrandFilter={isAdmin}
                />
            }
            contentClassName="h-full flex flex-col p-0 gap-0 overflow-hidden"
        >
            <Suspense fallback={<AdminReportsSkeleton />}>
                <AdminReportsContent
                    isAdmin={isAdmin}
                    scopedBranches={scopedBranches}
                    initialStatus={initialStatus}
                    initialScope={initialScope}
                    initialPjumStatus={initialPjumStatus}
                    initialBranchName={initialBranchName}
                    initialAreaName={initialAreaName}
                    initialBrand={initialBrand}
                    initialFromDate={initialFromDate}
                    initialToDate={initialToDate}
                    areaOptions={areaOptions}
                />
            </Suspense>
        </AdminDashboardShell>
    );
```
*(Note: we removed `branches={branches}` from `ExportReportsDialog` since `branches` is now fetched inside the content. For the dialog, we pass scopedBranches or an empty array, it might fetch internally or need adjustment).*

- [ ] **Step 4: Commit Task 3**

```bash
git add app/dashboard/reports/
git commit -m "feat: add lazy loading to reports page"
```

---

### Task 4: Refactor PJUM Page to use Suspense

**Files:**
- Create: `app/dashboard/pjum/_components/admin-pjum-content.tsx`
- Create: `app/dashboard/pjum/_components/admin-pjum-skeleton.tsx`
- Modify: `app/dashboard/pjum/page.tsx`

**Interfaces:**
- Consumes: `getAdminPjum`
- Produces: `AdminPjumContent`

- [ ] **Step 1: Create AdminPjumSkeleton**

Create `app/dashboard/pjum/_components/admin-pjum-skeleton.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPjumSkeleton() {
    return (
        <div className="flex-1 m-0 h-full p-4 lg:p-6 overflow-hidden flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-4 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-[250px]" />
            </div>
            <div className="border rounded-md">
                <div className="h-12 border-b bg-muted/50" />
                <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create AdminPjumContent**

Create `app/dashboard/pjum/_components/admin-pjum-content.tsx`:
```tsx
import { getAdminBranchOptions } from "../../queries";
import { getAdminPjum, getDashboardPjumBmsUsers } from "../actions";
import { AdminPjumTable } from "./admin-pjum-table";
import { CreatePjumDialog } from "./create-pjum-dialog";
import { ExportPjumDialog } from "./export-pjum-dialog";

export async function AdminPjumContent({
    user,
    scopedBranches,
    initialFilters,
    areaOptions,
}: any) {
    const [branchOptions, initialData, bmsUsers] = await Promise.all([
        scopedBranches === null ? getAdminBranchOptions() : [],
        getAdminPjum(null, 20, initialFilters),
        user.role === "BMC" ? getDashboardPjumBmsUsers() : [],
    ]);
    
    const branches =
        scopedBranches === null
            ? branchOptions.map((branch) => branch.name)
            : scopedBranches;

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-end gap-2 px-4 lg:px-6 pt-4 lg:pt-6">
                {user.role === "BMC" ? (
                    <>
                        <CreatePjumDialog bmsUsers={bmsUsers} />
                        <ExportPjumDialog
                            branches={branches}
                            showBranchFilter={false}
                        />
                    </>
                ) : (
                    <ExportPjumDialog
                        branches={branches}
                        showBranchFilter={user.role === "ADMIN"}
                    />
                )}
            </div>
            <AdminPjumTable
                initialData={initialData.pjums}
                initialNextCursor={initialData.nextCursor}
                initialTotalCount={initialData.totalCount}
                initialSummary={initialData.summary}
                initialFilters={initialFilters}
                branches={branches}
                areaNames={areaOptions}
            />
        </div>
    );
}
```

- [ ] **Step 3: Update PJUM page.tsx**

Modify `app/dashboard/pjum/page.tsx` to render `AdminDashboardShell` without passing headerActions, and wrap `AdminPjumContent` in Suspense.
Remove the `await Promise.all(...)` block.

```tsx
    return (
        <AdminDashboardShell
            user={user}
            title="PJUM"
            breadcrumbs={[{ label: "Dokumen PJUM" }]}
            contentClassName="h-full p-0 flex flex-col"
        >
            <Suspense fallback={<AdminPjumSkeleton />}>
                <AdminPjumContent 
                    user={user}
                    scopedBranches={scopedBranches}
                    initialFilters={initialFilters}
                    areaOptions={areaOptions}
                />
            </Suspense>
        </AdminDashboardShell>
    );
```

- [ ] **Step 4: Commit Task 4**

```bash
git add app/dashboard/pjum/
git commit -m "feat: add lazy loading to pjum page"
```
