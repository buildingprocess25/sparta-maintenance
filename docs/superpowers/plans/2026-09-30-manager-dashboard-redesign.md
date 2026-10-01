# Manager Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Priority and PJUM widgets in the BMC/BNM dashboard to be above the Status Distribution, and add the Realisasi Chart at the bottom (scoped to the user's branch).

**Architecture:** We will modify the `ManagerDashboard` component. We will move the JSX grid containing `PriorityReportsTable` and `SidePanel` to just below the `KpiGrid`. We will import `getAdminRealisasiDetail` to fetch the realisasi data (passing `user.branchNames` for scoping) and render the `RealisasiChartWidget` just before the recent activity widget.

**Tech Stack:** Next.js App Router, React Server Components, Tailwind CSS

## Global Constraints

- Must ensure all data fetched is strictly scoped to the user's `branchNames` (no cross-branch data leakage).

---

### Task 1: Update ManagerDashboard Layout and Add RealisasiChartWidget

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`

**Interfaces:**
- Consumes: `getAdminRealisasiDetail` from `app/dashboard/queries.ts`
- Consumes: `RealisasiChartWidget` from `app/dashboard/_components/admin/realisasi-chart-widget.tsx`

- [ ] **Step 1: Update Manager Dashboard Imports and Data Fetching**

Edit `app/dashboard/_components/manager-dashboard.tsx` to add imports and fetch data.

```tsx
// 1. Add getAdminRealisasiDetail to imports from "../queries"
import {
    getManagerDashboardData,
    getAdminCommandCenterData,
    getAdminRealisasiDetail,
    type ManagerDashboardData,
    type ManagerDashboardReport,
    type ManagerDashboardRole,
} from "../queries";

// 2. Add RealisasiChartWidget import
import { RealisasiChartWidget } from "./admin/realisasi-chart-widget";

// 3. Update the Server Component function to fetch realisasiData
export async function ManagerDashboard({
    user,
    role,
    period,
    brand,
}: {
    user: AuthUser;
    role: ManagerDashboardRole;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const data = await getManagerDashboardData({
        role,
        branchNames: user.branchNames,
    });
    const copy = getDashboardCopy(role);
    const resolvedPeriod = (period as any) || "ytd";
    const resolvedBrand = brand || "ALL";
    const adminData = await getAdminCommandCenterData(
        resolvedPeriod,
        resolvedBrand,
        user.branchNames
    );
    // NEW: Fetch Realisasi Data scoped to user branches
    const realisasiData = await getAdminRealisasiDetail(
        resolvedBrand,
        user.branchNames,
        resolvedPeriod
    );

    // ... return JSX
}
```

- [ ] **Step 2: Update Manager Dashboard JSX Layout**

Modify the JSX in `app/dashboard/_components/manager-dashboard.tsx` to reorder the components and insert the chart.

```tsx
    return (
        <AdminDashboardShell
            user={user}
            title={copy.title}
            breadcrumbs={[{ label: copy.title }]}
            contentClassName="md:p-6 space-y-6"
        >
            <DashboardHeader kpi={adminData.kpi} brand={resolvedBrand} />
            <KpiGrid 
                kpi={adminData.kpi} 
                pjum={adminData.pjum} 
                breakdown={adminData.brandBreakdown} 
                isBrandFiltered={resolvedBrand !== "ALL"} 
                brand={resolvedBrand} 
            />
            
            {/* MOVED UP: Priority Reports and Side Panel */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start pt-2 border-b pb-6 mb-2">
                <PriorityReportsTable
                    reports={data.priorityReports}
                    role={role}
                />
                <SidePanel data={data} />
            </div>

            {/* MOVED DOWN: Status Distribution */}
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
            
            <div className="mt-6">
                <PreventiveKpiWidget />
            </div>
            
            <ProcessDurationWidget />
            
            {/* NEW: Realisasi Chart Component */}
            <div className="mt-6">
                <RealisasiChartWidget initialData={realisasiData} brand={resolvedBrand} />
            </div>
            
            <div className="mt-6">
                <AdminRecentActivityCard activities={adminData.recentActivity} />
            </div>
        </AdminDashboardShell>
    );
```

- [ ] **Step 3: Commit changes**

```bash
git add app/dashboard/_components/manager-dashboard.tsx
git commit -m "feat: reorder manager dashboard widgets and add realisasi chart"
```
