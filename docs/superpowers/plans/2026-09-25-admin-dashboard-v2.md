# Admin Dashboard V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Admin Dashboard into a single, scrollable "pro-max" view accommodating comprehensive metrics (KPIs, SLA, Preventif, Realisasi) while preserving the v1 components.

**Architecture:** 
1. Create a new `AdminDashboardV2` component alongside the existing `AdminNewDashboard`.
2. Add a new query function `getAdminSlaPerformanceData` in `app/dashboard/queries.ts` to calculate the top 5 branches for specific SLA bottlenecks.
3. Build the UI using existing shadcn components, Recharts for the line/donut charts, and Tailwind CSS grid/flex for a responsive, single-page scrollable layout.
4. Update `app/dashboard/page.tsx` to render `AdminDashboardV2` for the `ADMIN` role.

**Tech Stack:** React, Next.js (App Router), Prisma, Tailwind CSS, shadcn/ui, Recharts

## Global Constraints

- Exact file paths always
- Complete code in every step
- Use existing shadcn components; do not introduce new UI libraries.
- Preserve all existing v1 components (`admin-new-dashboard.tsx`, etc.).

---

### Task 1: SLA Performance Queries

**Files:**
- Modify: `app/dashboard/queries.ts`

**Interfaces:**
- Consumes: Prisma `Report` and `ActivityLog` models.
- Produces: `getAdminSlaPerformanceData(window, brand, branchScope)` returning arrays of top 5 branches for 3 SLA metrics.

- [ ] **Step 1: Write the SLA performance query function**

```typescript
// Add at the end of app/dashboard/queries.ts

export type AdminSlaPerformanceDatum = {
    branchName: string;
    avgDurationHours: number;
    formattedDuration: string; // e.g. "03,20" (days,hours or similar, we'll use hours for simplicity)
};

export type AdminSlaPerformanceData = {
    estimasiToAppvBmc: AdminSlaPerformanceDatum[];
    appvBmcToAppvMgr: AdminSlaPerformanceDatum[];
    durasiPekerjaanBms: AdminSlaPerformanceDatum[];
};

export async function getAdminSlaPerformanceData(
    window: { start: Date; end?: Date },
    brand: StoreBrandFilter,
    branchScope?: string[]
): Promise<AdminSlaPerformanceData> {
    const reports = await prisma.report.findMany({
        where: {
            ...getReportBrandWhere(brand),
            ...(branchScope ? { branchName: { in: branchScope } } : {}),
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            status: { in: ["APPROVED_BMC", "COMPLETED"] },
            updatedAt: { gte: window.start, ...(window.end ? { lt: window.end } : {}) }
        },
        select: {
            branchName: true,
            activities: {
                select: { action: true, createdAt: true },
                orderBy: { createdAt: "asc" }
            }
        }
    });

    const slaEstimasi = new Map<string, number[]>();
    const slaAppvMgr = new Map<string, number[]>();
    const slaPekerjaan = new Map<string, number[]>();

    for (const report of reports) {
        const branch = report.branchName;
        let submittedAt = null, estimasiApprovedAt = null, workStartedAt = null, completionSubmittedAt = null, appvBmcAt = null, appvMgrAt = null;

        for (const act of report.activities) {
            if (act.action === "SUBMITTED") submittedAt = act.createdAt;
            if (act.action === "ESTIMATION_APPROVED") estimasiApprovedAt = act.createdAt;
            if (act.action === "WORK_STARTED") workStartedAt = act.createdAt;
            if (act.action === "COMPLETION_SUBMITTED") completionSubmittedAt = act.createdAt;
            if (act.action === "WORK_APPROVED") appvBmcAt = act.createdAt;
            if (act.action === "FINAL_APPROVED_BNM") appvMgrAt = act.createdAt;
        }

        // 1. Estimasi ke Appv BMC (Submitted -> Estimation Approved)
        if (submittedAt && estimasiApprovedAt) {
            const hrs = (estimasiApprovedAt.getTime() - submittedAt.getTime()) / 3600000;
            if (!slaEstimasi.has(branch)) slaEstimasi.set(branch, []);
            slaEstimasi.get(branch)!.push(hrs);
        }

        // 2. Appv BMC ke Appv Mgr (Work Approved -> Final Approved BNM)
        if (appvBmcAt && appvMgrAt) {
            const hrs = (appvMgrAt.getTime() - appvBmcAt.getTime()) / 3600000;
            if (!slaAppvMgr.has(branch)) slaAppvMgr.set(branch, []);
            slaAppvMgr.get(branch)!.push(hrs);
        }

        // 3. Durasi Pekerjaan BMS (Work Started -> Completion Submitted)
        if (workStartedAt && completionSubmittedAt) {
            const hrs = (completionSubmittedAt.getTime() - workStartedAt.getTime()) / 3600000;
            if (!slaPekerjaan.has(branch)) slaPekerjaan.set(branch, []);
            slaPekerjaan.get(branch)!.push(hrs);
        }
    }

    const formatSla = (map: Map<string, number[]>) => {
        return Array.from(map.entries()).map(([branchName, durations]) => {
            const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length;
            const days = Math.floor(avgHours / 24);
            const hours = Math.round(avgHours % 24);
            return {
                branchName,
                avgDurationHours: avgHours,
                formattedDuration: `${days.toString().padStart(2, '0')},${hours.toString().padStart(2, '0')}`
            };
        }).sort((a, b) => b.avgDurationHours - a.avgDurationHours).slice(0, 5);
    };

    return {
        estimasiToAppvBmc: formatSla(slaEstimasi),
        appvBmcToAppvMgr: formatSla(slaAppvMgr),
        durasiPekerjaanBms: formatSla(slaPekerjaan)
    };
}
```

- [ ] **Step 2: Update `getAdminCommandCenterData` payload**

```typescript
// In app/dashboard/queries.ts
// Add to AdminCommandCenterData type definition:
export type AdminCommandCenterData = {
    // ... existing fields ...
    slaPerformance?: AdminSlaPerformanceData;
    userStats?: {
        totalStoreAlfamart: number;
        totalStoreLawson: number;
        totalTimCabang: number;
        totalManagerCabang: number;
        totalBmc: number;
        totalBms: number;
    };
};

// Inside getAdminCommandCenterData function (around line 1850):
// Find the Promise.all for kpi, branches, trends, stuckReports.
// Just below it (before brandBreakdown logic), add:

    const [slaPerformance, totalStoreAlfamart, totalStoreLawson, totalBms, totalBmc, totalManager] = await Promise.all([
        getAdminSlaPerformanceData(trendWindow, brand, branchScope),
        prisma.store.count({ where: { brand: "ALFAMART", isActive: true } }),
        prisma.store.count({ where: { brand: "LAWSON", isActive: true } }),
        prisma.user.count({ where: { role: "BMS", deletedAt: null } }),
        prisma.user.count({ where: { role: "BMC", deletedAt: null } }),
        prisma.user.count({ where: { role: "BNM_MANAGER", deletedAt: null } }),
    ]);

// And include them in the return statement:
    return {
        kpi,
        status,
        trends,
        branchOptions: hierarchy.options,
        branches,
        stuckReports,
        pjum,
        recentActivity,
        brandBreakdown,
        slaPerformance,
        userStats: {
            totalStoreAlfamart,
            totalStoreLawson,
            totalTimCabang: totalBms + totalBmc + totalManager,
            totalManagerCabang: totalManager,
            totalBmc: totalBmc,
            totalBms: totalBms
        }
    };
```

---

### Task 2: Scaffold `AdminDashboardV2` Component

**Files:**
- Create: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AdminCommandCenterData` and `AdminRealisasiDetail`

- [ ] **Step 1: Create the V2 Dashboard Shell**

```tsx
// app/dashboard/_components/admin/admin-dashboard-v2.tsx
"use client";

import { User } from "@prisma/client";
import { AdminCommandCenterData } from "../../../queries";
import { AdminRealisasiDetail } from "../../../queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTrendFilter } from "./admin-trend-filter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

type AdminDashboardV2Props = {
    user: User;
    data: AdminCommandCenterData;
    realisasiData: AdminRealisasiDetail;
    period?: string;
    brand?: string;
};

export function AdminDashboardV2({ user, data, realisasiData, period, brand }: AdminDashboardV2Props) {
    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard V2</h1>
                <AdminTrendFilter currentPeriod={period} currentBrand={brand} />
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Total Laporan</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.kpi.totalReports.toLocaleString("id-ID")}</div>
                        {data.brandBreakdown && (
                            <div className="text-sm mt-2 flex gap-4">
                                <span className="text-red-600 font-medium">Alfamart: {data.brandBreakdown.alfamart.kpi.totalReports}</span>
                                <span className="text-blue-600 font-medium">Lawson: {data.brandBreakdown.lawson.kpi.totalReports}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Penyelesaian</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.kpi.completionRate}%</div>
                        <div className="text-xs text-muted-foreground mt-2 flex flex-col gap-1">
                            <div className="text-green-600">Sudah PJUM: {data.kpi.pjumCompletedReports}</div>
                            <div className="text-red-600">Belum PJUM: {data.kpi.unpjumCompletedReports}</div>
                            <div className="text-gray-500">Tanpa PJUM: {data.kpi.unpjumNotRequiredReports}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Realisasi & PJUM</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">Rp {data.kpi.totalRealisasi.toLocaleString("id-ID")}</div>
                        <div className="text-xs text-muted-foreground mt-2 flex flex-col gap-1">
                            <div>PJUM Disetujui: {data.pjum.approved}</div>
                            <div>Review PJUM: {data.pjum.pending}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase">Status Bottleneck</CardTitle></CardHeader>
                    <CardContent className="overflow-auto max-h-32">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {data.status.map(s => (
                                <div key={s.status} className="flex justify-between border-b pb-1">
                                    <span className="text-muted-foreground">{s.label}:</span>
                                    <span className="font-semibold">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2 & 3: Preventif & SLA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Preventif Left Side */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <Card className="flex-1">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-center">PENCAPAIAN PREVENTIF</CardTitle></CardHeader>
                        <CardContent className="flex flex-col items-center justify-center h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{name: 'OK', value: 87}, {name: 'NOT OK', value: 13}]} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                                        <Cell fill="#22c55e" />
                                        <Cell fill="#ef4444" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-2xl font-bold mt-6">87%</div>
                        </CardContent>
                    </Card>
                    <Card className="flex-1">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-center uppercase">5 Cabang Preventif Rendah</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium text-red-600">
                                <li>• PONTIANAK = 43,40%</li>
                                <li>• LOMBOK = 48,80%</li>
                                <li>• MADIUN = 58,29%</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* SLA Right Side */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-center uppercase text-muted-foreground">5 Cabang SL Estimasi ke Appv BMC Tertinggi</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium text-red-600">
                                {data.slaPerformance?.estimasiToAppvBmc.map((s, i) => (
                                    <li key={i}>• {s.branchName} = {s.formattedDuration}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-center uppercase text-muted-foreground">5 Cabang SL Durasi Pekerjaan BMS Tertinggi</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium text-red-600">
                                {data.slaPerformance?.durasiPekerjaanBms.map((s, i) => (
                                    <li key={i}>• {s.branchName} = {s.formattedDuration}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-center uppercase text-muted-foreground">5 Cabang SL Appv BMC ke Appv Mgr Tertinggi</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm font-medium text-red-600 columns-1 md:columns-2">
                                {data.slaPerformance?.appvBmcToAppvMgr.map((s, i) => (
                                    <li key={i}>• {s.branchName} = {s.formattedDuration}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer Stats (Moved above chart for better visual balance, matching mockup roughly) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="pt-6 text-center"><div className="text-sm font-medium text-muted-foreground uppercase">Total Toko Nasional</div><div className="text-2xl font-bold mt-2">{(data.userStats?.totalStoreAlfamart || 0) + (data.userStats?.totalStoreLawson || 0)}</div></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><div className="text-sm font-medium text-muted-foreground uppercase">Total Tim Cabang</div><div className="text-2xl font-bold mt-2">{data.userStats?.totalTimCabang || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><div className="text-sm font-medium text-muted-foreground uppercase">Manager Cabang</div><div className="text-2xl font-bold mt-2">{data.userStats?.totalManagerCabang || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><div className="text-sm font-medium text-muted-foreground uppercase">Total BMC Cabang</div><div className="text-2xl font-bold mt-2">{data.userStats?.totalBmc || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-6 text-center"><div className="text-sm font-medium text-muted-foreground uppercase">Total BMS Cabang</div><div className="text-2xl font-bold mt-2">{data.userStats?.totalBms || 0}</div></CardContent></Card>
            </div>

            {/* Row 4: Dana Taktis Line Chart */}
            <Card className="w-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-center uppercase">Rata-Rata Penggunaan Dana Taktis Per Laporan</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={realisasiData.byBranch} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="branchName" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" orientation="left" stroke="#ef4444" tickFormatter={(val) => `Rp ${(val/1000)}k`} tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{ fontSize: 10 }} />
                            <RechartsTooltip formatter={(value: number, name: string) => [
                                name === 'avg' ? `Rp ${value.toLocaleString("id-ID")}` : value, 
                                name === 'avg' ? 'AVG BIAYA' : 'JUMLAH LAPORAN'
                            ]} />
                            <Legend verticalAlign="top" height={36} formatter={(value) => <span className="text-xs font-semibold">{value === 'avg' ? 'AVG BIAYA' : 'JUMLAH LAPORAN'}</span>} />
                            <Line yAxisId="left" type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 6 }} />
                            <Line yAxisId="right" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
```

- [ ] **Step 2: Update Page routing to use V2**

```tsx
// app/dashboard/page.tsx
// Modify line 5 to include the new component, and update the ADMIN case:

import { requireAuth } from "@/lib/authorization";
import { BmsDashboard } from "./_components/bms-dashboard";
import { BmcDashboard } from "./_components/bmc-dashboard";
import { BnmDashboard } from "./_components/bnm-dashboard";
import { AdminNewDashboard } from "./_components/admin/admin-new-dashboard";
import { AdminDashboardV2 } from "./_components/admin/admin-dashboard-v2";
import { getAdminCommandCenterData, getAdminRealisasiDetail } from "./queries";

// ... inside DashboardPage:

        case "ADMIN":
            const [data, realisasiData] = await Promise.all([
                getAdminCommandCenterData(period, brand),
                getAdminRealisasiDetail(brand)
            ]);
            return <AdminDashboardV2 user={user} data={data} realisasiData={realisasiData} period={period} brand={brand} />;
```

---
