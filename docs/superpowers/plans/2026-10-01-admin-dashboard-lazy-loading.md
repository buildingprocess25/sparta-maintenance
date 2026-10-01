# Admin Dashboard Lazy Loading (Suspense Streaming) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement React Suspense (Streaming) for the Admin Dashboard to unblock the initial HTML load, allowing the shell to render instantly while heavy data fetching resolves in the background.

**Architecture:** We will create a skeleton loader component and refactor the main dashboard component to separate the synchronous shell from the asynchronous data fetching component, wrapping the latter in `<Suspense>`.

**Tech Stack:** Next.js (App Router), React (Suspense), TailwindCSS, shadcn/ui

## Global Constraints

- Use `import { Suspense } from "react"` for React features.
- Ensure `Skeleton` component is imported from `@/components/ui/skeleton`.

---

### Task 1: Create Admin Dashboard Skeleton

**Files:**
- Create: `app/dashboard/_components/admin/admin-dashboard-skeleton.tsx`

**Interfaces:**
- Produces: `export function AdminDashboardSkeleton()`

- [ ] **Step 1: Write the Skeleton Component Implementation**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[350px]" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-36" />
                </div>
            </div>

            {/* KPI Grid Skeleton */}
            <div className="grid gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-48">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="mt-2 h-8 w-16" />
                            <Skeleton className="mt-1 h-3 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-2 w-full mt-4 mb-4" />
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Status Distribution Skeleton */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-[300px] w-full" />
            </div>
            
            {/* Chart Skeleton */}
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/admin/admin-dashboard-skeleton.tsx
git commit -m "feat(dashboard): add admin dashboard skeleton component"
```

---

### Task 2: Refactor AdminNewDashboard for Suspense

**Files:**
- Modify: `app/dashboard/_components/admin/admin-new-dashboard.tsx`

**Interfaces:**
- Consumes: `AdminDashboardSkeleton` from `./admin-dashboard-skeleton`

- [ ] **Step 1: Extract asynchronous data fetching into `AdminDashboardContent`**

In `app/dashboard/_components/admin/admin-new-dashboard.tsx`, add the necessary imports at the top:
```tsx
import { Suspense } from "react";
import { AdminDashboardSkeleton } from "./admin-dashboard-skeleton";
import type { AdminTrendPeriod } from "../queries";
```

Scroll to the bottom where `AdminNewDashboard` is defined. Replace the existing `AdminNewDashboard` implementation with the following split components:

```tsx
async function AdminDashboardContent({ 
    period, 
    brand 
}: { 
    period: AdminTrendPeriod; 
    brand: StoreBrandFilter 
}) {
    const data = await getAdminCommandCenterData(period, brand);

    return (
        <>
            <DashboardHeader kpi={data.kpi} brand={brand} />
            <KpiGrid
                kpi={data.kpi}
                pjum={data.pjum}
                breakdown={data.brandBreakdown}
                isBrandFiltered={brand !== "ALL"}
                brand={brand}
            />

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            Distribusi Status &amp; SLA
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Komposisi laporan aktif dan status yang melewati
                            batas waktu operasional.
                        </p>
                    </div>
                    <StatusDistributionKpis 
                        status={data.status} 
                        breakdown={data.brandBreakdown ? { alfamart: data.brandBreakdown.alfamart.kpi.activeReports, lawson: data.brandBreakdown.lawson.kpi.activeReports } : undefined} 
                    />
                </div>
                <SlaStatusGuide />
            </section>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>
                                Realisasi per Cabang (Sudah PJUM)
                            </CardTitle>
                            <CardDescription>
                                Total realisasi yang sudah PJUM dan rata-rata
                                realisasi BMS per minggu untuk membaca kecukupan
                                uang muka cabang
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AdminTrendChart data={data.trends} />
                </CardContent>
            </Card>

            <BranchPerformanceTable branches={data.branches} brand={brand} />
            <AttentionTable
                reports={data.stuckReports}
                title="Stuck Reports"
                description="Laporan aktif yang tidak bergerak lebih dari 7 hari"
                emptyMessage="Tidak ada laporan stuck lebih dari 7 hari."
                icon={Clock3}
                viewHref={withBrandHref("/dashboard/reports?scope=overdue", brand)}
                viewLabel="Buka SLA"
            />
            <AdminRecentActivityCard activities={data.recentActivity} />
        </>
    );
}

export function AdminNewDashboard({
    user,
    period,
    brand,
}: {
    user: AuthUser;
    period?: string;
    brand?: StoreBrandFilter;
}) {
    const selectedPeriod = normalizePeriod(period);
    const selectedBrand = brand ?? "ALL";

    return (
        <AdminDashboardShell
            user={user}
            title="Dashboard"
            breadcrumbs={[{ label: "Dashboard" }]}
            contentClassName="md:p-6"
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={selectedPeriod}
                    initialBrand={selectedBrand}
                    showBrandFilter
                />
            }
        >
            <Suspense fallback={<AdminDashboardSkeleton />}>
                <AdminDashboardContent period={selectedPeriod} brand={selectedBrand} />
            </Suspense>
        </AdminDashboardShell>
    );
}
```

*Note: Make sure to remove the `async` keyword from `AdminNewDashboard` and move the `getAdminCommandCenterData` call into `AdminDashboardContent`.*

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/admin/admin-new-dashboard.tsx
git commit -m "refactor(dashboard): wrap admin dashboard with React Suspense for fast initial load"
```
