# Global Dashboards Lazy Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement React Suspense (Lazy Loading) and disable aggressive prefetching (`prefetch={false}`) across Manager (BMC/BNM) and BMS dashboards to optimize initial render and prevent database flooding.

**Architecture:** 
1. We will extract asynchronous data fetching inside `ManagerDashboard` and `BmsDashboard` into inner `Content` components wrapped in `<Suspense>`.
2. We will create a new skeleton for the BMS dashboard (`BmsDashboardSkeleton`). `ManagerDashboard` will reuse the existing `AdminDashboardSkeleton`.
3. We will append `prefetch={false}` to `<Link>` components in these files and key navigation headers to stop Next.js background fetch behavior.

**Tech Stack:** Next.js (App Router), React (Suspense), TailwindCSS, shadcn/ui

## Global Constraints

- Use `import { Suspense } from "react"` for React features.
- Ensure `Skeleton` component is imported from `@/components/ui/skeleton`.

---

### Task 1: Create BMS Dashboard Skeleton

**Files:**
- Create: `app/dashboard/_components/bms-dashboard-skeleton.tsx`

**Interfaces:**
- Produces: `export function BmsDashboardSkeleton()`

- [ ] **Step 1: Write the BMS Skeleton Component Implementation**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function BmsDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            {/* Welcome Card Skeleton */}
            <Card className="border-none bg-primary text-primary-foreground shadow-md">
                <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 bg-primary-foreground/20 mb-2" />
                    <Skeleton className="h-4 w-1/2 bg-primary-foreground/20 mb-6" />
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
                        <Skeleton className="h-8 w-40 bg-primary-foreground/20" />
                    </div>
                </CardContent>
            </Card>

            {/* Create Report Button Skeleton */}
            <Skeleton className="h-12 w-full rounded-md" />

            {/* Preventive Card Skeleton */}
            <Card>
                <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex flex-col gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-4 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Activity List Skeleton */}
            <section className="flex flex-col gap-3 mt-4">
                <div className="flex items-end justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </section>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/bms-dashboard-skeleton.tsx
git commit -m "feat(dashboard): add bms dashboard skeleton"
```

---

### Task 2: Refactor BmsDashboard for Suspense & Prefetch

**Files:**
- Modify: `app/dashboard/_components/bms-dashboard.tsx`

**Interfaces:**
- Consumes: `BmsDashboardSkeleton` from `./bms-dashboard-skeleton`

- [ ] **Step 1: Update Link to disable prefetch in `BmsMobileActivityList`**

In `BmsMobileActivityList`, change `<Link>` to `<Link prefetch={false}>`:
```tsx
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link prefetch={false} href="/activity" className="text-xs font-semibold uppercase">
            Lihat Semua
          </Link>
        </Button>
```

- [ ] **Step 2: Extract data fetching and wrap in Suspense**

Add imports at the top:
```tsx
import { Suspense } from "react";
import { BmsDashboardSkeleton } from "./bms-dashboard-skeleton";
```

Refactor the bottom portion:
```tsx
async function BmsDashboardContent({ user }: { user: AuthUser }) {
  const [stats, activities, coverage, balanceInfo, activeReportBlocker] = await Promise.all([
    getUserStats(user.NIK),
    getBMSActivity(user.NIK),
    getBmsPreventiveCoverage(user),
    calculateBmsBalance(user.NIK),
    getBmsActiveReportBlocker(user.NIK),
  ]);
  const statItems: BmsMobileDashboardStatItem[] = [
    {
      key: "all",
      total: stats.totalReports,
      label: "Semua Laporan",
      icon: FileText,
      tone: "neutral",
      caption: "Total laporan",
      href: "/reports?status=all",
    },
    {
      key: "active",
      total: stats.activeReports,
      label: "Laporan Aktif",
      icon: Clock,
      tone: "progress",
      caption: "Sedang berjalan",
      href: "/reports?status=active",
    },
    {
      key: "need-action",
      total: stats.needsAction,
      label: "Perlu Tindakan",
      icon: AlertCircle,
      tone: "critical",
      caption: "Revisi / mulai pekerjaan",
      href: "/reports?status=needs_action",
    },
    {
      key: "completed",
      total: stats.completed,
      label: "Selesai",
      icon: CheckCircle2,
      tone: "done",
      caption: "Selesai & disetujui",
      href: "/reports?status=completed",
    },
  ];

  return (
    <>
      <BmsWelcomeCard name={user.name} balance={balanceInfo} />

      <BmsCreateReportButton
        blocker={activeReportBlocker}
        label="Buat Laporan Baru"
        mobileLabel="Buat Laporan Baru"
        size="lg"
        className="h-12 w-full"
      />

      <BmsPreventiveCard coverage={coverage} />

      <BmsMobileDashboardStats items={statItems} />
      <BmsMobileActivityList activities={activities} />
    </>
  );
}

export function BmsDashboard({ user }: { user: AuthUser }) {
  return (
    <BmsMobilePage
      navItem="dashboard"
      userInitials={user.name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")}
    >
      <Suspense fallback={<BmsDashboardSkeleton />}>
        <BmsDashboardContent user={user} />
      </Suspense>
    </BmsMobilePage>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/bms-dashboard.tsx
git commit -m "refactor(dashboard): add suspense and disable prefetch for bms dashboard"
```

---

### Task 3: Refactor ManagerDashboard for Suspense & Prefetch

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`

**Interfaces:**
- Consumes: `AdminDashboardSkeleton` from `./admin/admin-dashboard-skeleton`

- [ ] **Step 1: Add Imports**

```tsx
import { Suspense } from "react";
import { AdminDashboardSkeleton } from "./admin/admin-dashboard-skeleton";
```

- [ ] **Step 2: Add `prefetch={false}` to Links**

In `PriorityReportsTable`, update all three `<Link>` tags to include `prefetch={false}`:
```tsx
                    <Button asChild variant="outline" size="sm">
                        <Link prefetch={false} href={copy.primaryHref}>
                            Buka tabel
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
```
```tsx
                                            <Link
                                                prefetch={false}
                                                href={`/dashboard/reports/${report.reportNumber}`}
                                                className="inline-flex items-center gap-1 font-mono font-medium text-primary underline-offset-4 hover:underline"
                                            >
```

In `SidePanel`, update all `<Link>` tags to include `prefetch={false}`.

- [ ] **Step 3: Extract data fetching and wrap in Suspense**

Replace the `ManagerDashboard` component:
```tsx
async function ManagerDashboardContent({
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
    const resolvedPeriod = (period as any) || "ytd";
    const resolvedBrand = brand || "ALL";
    const adminData = await getAdminCommandCenterData(
        resolvedPeriod,
        resolvedBrand,
        user.branchNames
    );

    return (
        <>
            <DashboardHeader kpi={adminData.kpi} brand={resolvedBrand} />
            <KpiGrid 
                kpi={adminData.kpi} 
                pjum={adminData.pjum} 
                breakdown={adminData.brandBreakdown} 
                isBrandFiltered={resolvedBrand !== "ALL"} 
                brand={resolvedBrand} 
            />
            
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
            
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start pt-6 border-t mt-8">
                <PriorityReportsTable
                    reports={data.priorityReports}
                    role={role}
                />
                <SidePanel data={data} />
            </div>
            
            <AdminRecentActivityCard activities={adminData.recentActivity} />
        </>
    );
}

export function ManagerDashboard({
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
    const copy = getDashboardCopy(role);

    return (
        <AdminDashboardShell
            user={user}
            title={copy.title}
            breadcrumbs={[{ label: copy.title }]}
            contentClassName="md:p-6 space-y-6"
        >
            <Suspense fallback={<AdminDashboardSkeleton />}>
                <ManagerDashboardContent user={user} role={role} period={period} brand={brand} />
            </Suspense>
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/_components/manager-dashboard.tsx
git commit -m "refactor(dashboard): add suspense and disable prefetch for manager dashboard"
```
