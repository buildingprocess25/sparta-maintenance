# Dashboard BMC & BNM Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the rich Admin dashboard layout (Option B - Appended) to BMC and BNM roles, filtering data only to their branches while retaining their specific priority and PJUM pending panels.

**Architecture:** Modify `getAdminCommandCenterData` and its underlying queries to accept an optional `branchScope` array. Pass the user's `branchNames` from `ManagerDashboard` to this function, then render a unified layout that combines the Admin KPI/Trend sections with the Manager-specific priority tables at the bottom.

**Tech Stack:** Next.js App Router, React Server Components, Prisma, Tailwind CSS.

## Global Constraints

- Must maintain strict data isolation: BMC/BNM users must NEVER see data from branches outside their `user.branchNames`.
- Do not break the existing Admin dashboard.
- Follow existing file conventions and use React Server Components for data fetching.

---

### Task 1: Add Branch Scope to Admin Queries

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Existing Prisma schema.
- Produces: `getAdminCommandCenterData` signature updated to `(period?: AdminTrendPeriod, brand?: StoreBrandFilter, branchScope?: string[])`.

- [ ] **Step 1: Update getAdminStatusDistribution**
Update the function signature to accept `branchScope?: string[]`.
Update the `where` clause to include `...(branchScope ? { branchName: { in: branchScope } } : {}),`.

- [ ] **Step 2: Update getAdminPjumSummary**
Update the function signature to accept `branchScope?: string[]`.
Update the `where` clause in both Prisma calls to include `...(branchScope ? { branchName: { in: branchScope } } : {}),`.

- [ ] **Step 3: Update getAdminKpiMetric and getAdminBrandBreakdownKpi**
Update their signatures to accept `branchScope?: string[]`.
Update the `where` clauses in all Prisma counts and aggregates to include `...(branchScope ? { branchName: { in: branchScope } } : {}),`.

- [ ] **Step 4: Update getAdminStuckReports**
Update the function signature to accept `branchScope?: string[]`.
Update the `where` clause to include `...(branchScope ? { branchName: { in: branchScope } } : {}),`.

- [ ] **Step 5: Update getAdminCommandCenterData**
Update signature to `export async function getAdminCommandCenterData(period: AdminTrendPeriod = "ytd", brand: StoreBrandFilter = "ALL", branchScope?: string[])`.
Pass `branchScope` into `getAdminStatusDistribution`, `getAdminPjumSummary`, `getAdminKpiMetric`, and `getAdminStuckReports`.
For `visibleBranchNames` (used by BranchPerformance and BranchTrend), intersect it with `branchScope` if provided: 
```typescript
let visibleBranchNames = await getBrandOwnedBranchNames(brand, hierarchy);
if (branchScope) {
    visibleBranchNames = visibleBranchNames.filter(b => branchScope.includes(b));
}
```

- [ ] **Step 6: Update getAdminRealisasiDetail**
Update signature to `(brand: StoreBrandFilter = "ALL", branchScope?: string[])`.
Update the `where` clause to include `...(branchScope ? { branchName: { in: branchScope } } : {}),`.

- [ ] **Step 7: Run TypeScript verification**
Run: `npx tsc --noEmit`
Expected: No type errors related to `queries.ts`.

---

### Task 2: Propagate Props to ManagerDashboard

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/_components/bmc-dashboard.tsx`
- Modify: `app/dashboard/_components/bnm-dashboard.tsx`

**Interfaces:**
- Consumes: The `period` and `brand` parsed from search params in `page.tsx`.
- Produces: `ManagerDashboard` receiving `period` and `brand`.

- [ ] **Step 1: Update BmcDashboard and BnmDashboard**
In `bmc-dashboard.tsx` and `bnm-dashboard.tsx`, add `period?: string` and `brand?: StoreBrandFilter` to their props. Pass them down to `<ManagerDashboard>`.

- [ ] **Step 2: Update dashboard/page.tsx**
Pass `period` and `brand` props to `<BmcDashboard>` and `<BnmDashboard>` inside the switch statement.

- [ ] **Step 3: Run TypeScript verification**
Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 3: Revamp ManagerDashboard Layout

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`

**Interfaces:**
- Consumes: `getAdminCommandCenterData` (from Task 1) and `getManagerDashboardData`.
- Produces: A new layout for BMC/BNM that combines Admin styling with Manager-specific panels.

- [ ] **Step 1: Import Admin Dashboard Components**
In `manager-dashboard.tsx`, import `getAdminCommandCenterData` from `../queries`.
Import the required Admin components from `./admin/admin-new-dashboard` (You may need to export them from `admin-new-dashboard.tsx` or duplicate them if they aren't exported. For simplicity, we will copy `KpiGrid`, `StatusDistributionKpis`, `SlaStatusGuide`, and `AdminRecentActivityCard` into a shared file or export them. Wait, let's export them from `admin-new-dashboard.tsx`).

- [ ] **Step 2: Export components from admin-new-dashboard.tsx**
Modify `app/dashboard/_components/admin/admin-new-dashboard.tsx` to export: `DashboardHeader`, `KpiGrid`, `StatusDistributionKpis`, `SlaStatusGuide`, `AdminRecentActivityCard`, `BranchPerformanceTable`.

- [ ] **Step 3: Update ManagerDashboard props and data fetching**
Update `ManagerDashboard` signature to accept `period?: string` and `brand?: StoreBrandFilter`.
Fetch both datasets:
```typescript
const data = await getManagerDashboardData({ role, branchNames: user.branchNames });
const adminData = await getAdminCommandCenterData(
    (period as any) || "ytd", 
    brand || "ALL", 
    user.branchNames
);
```

- [ ] **Step 4: Rebuild the Layout (Appended Style)**
Replace the old `DashboardIntro`, `ManagerKpiGrid`, and `RecentActivity` in the return statement.
Use the exported Admin components:
```tsx
<AdminDashboardShell user={user} title="Dashboard" contentClassName="md:p-6 space-y-6">
    <DashboardHeader kpi={adminData.kpi} brand={brand || "ALL"} />
    <KpiGrid kpi={adminData.kpi} pjum={adminData.pjum} breakdown={adminData.brandBreakdown} isBrandFiltered={brand !== "ALL"} brand={brand || "ALL"} />
    <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Distribusi Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <StatusDistributionKpis status={adminData.status} breakdown={undefined} />
                </CardContent>
            </Card>
        </div>
        <SlaStatusGuide />
    </div>
    
    {/* Admin Trends and Branch Performance */}
    <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <AdminTrendChart data={adminData.trends} period={(period as any) || "ytd"} />
        </div>
        <BranchPerformanceTable branches={adminData.branches} brand={brand || "ALL"} />
    </div>
    
    {/* Appended BMC/BNM Specific Panels */}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start pt-6 border-t mt-8">
        <PriorityReportsTable reports={data.priorityReports} role={role} />
        <SidePanel data={data} />
    </div>
    <AdminRecentActivityCard activities={adminData.recentActivity} />
</AdminDashboardShell>
```

- [ ] **Step 5: Verify build**
Run: `npm run build`
Expected: Build succeeds without errors.
