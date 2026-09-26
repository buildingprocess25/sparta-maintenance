# Checklist Preventif KPI Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a "Checklist Preventif" component on the Admin/Manager dashboard showing national/branch compliance (Capaian) and the top 5 lowest compliant branches. If a specific branch is selected, the list changes to show the "Quarterly Pace" (completion trends per month).

**Architecture:** We will create a new Server Action to aggregate preventive completion data, returning dynamic lists based on the selected filters (Branch ranking vs Monthly pacing). A Client Component will render the Donut chart and progress bars with interactive filters.

**Tech Stack:** Next.js (App Router), Prisma, Recharts, Tailwind CSS.

## Global Constraints

- Use `hasCompletePreventiveEvidence` logic from `lib/report-preventive-sql` to determine if a store has completed its preventive check.
- Keep the component style identical to the provided screenshot (orange badge for CONTOH, green/red/orange progress bars).

---

### Task 1: Create the Server Action for KPI Data

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: `getJakartaYearWindow`, `getJakartaQuarterWindow`, `getJakartaMonth`, `getJakartaCurrentQuarter` from `@/lib/time`
- Produces: `getAdminPreventiveKpiData(year: number, quarter: PreventiveQuarter | "all", branchName?: string)` returning `PreventiveKpiData`

- [ ] **Step 1: Export Data Types in `actions.ts`**

Add the following types near the top of the file:

```typescript
export type PreventiveKpiListItem = {
    label: string;
    completed: number;
    total: number;
    percentage: number;
};

export type PreventiveKpiData = {
    capaianNasional: number;
    tercapai: number;
    belum: number;
    listTitle: string;
    listItems: PreventiveKpiListItem[];
};
```

- [ ] **Step 2: Implement the `getAdminPreventiveKpiData` action**

Add this function to the bottom of `app/dashboard/preventive/actions.ts`:

```typescript
export async function getAdminPreventiveKpiData(
    year: number,
    quarter: PreventiveQuarter | "all",
    branchName?: string,
): Promise<PreventiveKpiData> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }

    const where: Prisma.StoreWhereInput = {
        isActive: true,
        ...getBranchScope(user),
    };

    if (branchName && branchName !== "all") {
        if (user.role !== "ADMIN" && !user.branchNames.includes(branchName)) {
            throw new Error("Unauthorized");
        }
        where.branchName = branchName;
    }

    const allStores = await prisma.store.findMany({
        where,
        select: { code: true, branchName: true },
    });

    const storeCodes = allStores.map((s) => s.code);
    
    let qStart: Date, qEnd: Date;
    if (quarter === "all") {
        const win = getJakartaYearWindow(year);
        qStart = win.start;
        qEnd = win.endExclusive;
    } else {
        const win = getJakartaQuarterWindow(year, quarter);
        qStart = win.start;
        qEnd = win.endExclusive;
    }

    const reportPredicates: Prisma.Sql[] = [
        completePreventiveEvidenceSql({
            statusColumn: Prisma.sql`r."status"`,
            itemsColumn: Prisma.sql`r."items"`,
        }),
        Prisma.sql`r."createdAt" >= ${qStart}`,
        Prisma.sql`r."createdAt" < ${qEnd}`,
    ];

    if (user.role === "ADMIN") {
        if (branchName && branchName !== "all") {
            reportPredicates.push(Prisma.sql`r."branchName" = ${branchName}`);
        } else {
            reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
        }
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    const reports = storeCodes.length === 0 ? [] : await prisma.$queryRaw<{ storeCode: string, createdAt: Date }[]>`
        SELECT r."storeCode", r."createdAt"
        FROM "Report" r
        WHERE ${Prisma.join(reportPredicates, " AND ")}
          AND r."storeCode" IN (${Prisma.join(storeCodes)})
    `;

    // Deduplicate: a store might have multiple complete reports. Take the earliest one.
    const completedStores = new Map<string, Date>();
    for (const r of reports) {
        const existing = completedStores.get(r.storeCode);
        if (!existing || r.createdAt < existing) {
            completedStores.set(r.storeCode, r.createdAt);
        }
    }
    
    const totalCompleted = completedStores.size;
    const totalStoresCount = allStores.length;
    const capaianNasional = totalStoresCount === 0 ? 0 : Math.round((totalCompleted / totalStoresCount) * 100);
    
    let listTitle = "";
    let listItems: PreventiveKpiListItem[] = [];
    
    if (!branchName || branchName === "all") {
        listTitle = "5 Cabang Preventif Terendah";
        const groupMap = new Map<string, { total: number; completed: number }>();
        for (const store of allStores) {
            const current = groupMap.get(store.branchName) || { total: 0, completed: 0 };
            current.total++;
            if (completedStores.has(store.code)) current.completed++;
            groupMap.set(store.branchName, current);
        }
        
        listItems = Array.from(groupMap.entries())
            .map(([label, data]) => ({
                label,
                completed: data.completed,
                total: data.total,
                percentage: data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100)
            }))
            .sort((a, b) => a.percentage - b.percentage)
            .slice(0, 5);
    } else {
        if (quarter === "all") {
            listTitle = "Tren Penyelesaian per Triwulan";
            const quartersData = [
                { label: "Triwulan 1", completed: 0 },
                { label: "Triwulan 2", completed: 0 },
                { label: "Triwulan 3", completed: 0 },
                { label: "Triwulan 4", completed: 0 },
            ];
            for (const date of completedStores.values()) {
                const q = getJakartaCurrentQuarter(date);
                quartersData[q - 1].completed++;
            }
            listItems = quartersData.map(q => ({
                label: q.label,
                completed: q.completed,
                total: totalStoresCount,
                percentage: totalStoresCount === 0 ? 0 : Math.round((q.completed / totalStoresCount) * 100)
            }));
        } else {
            listTitle = "Tren Penyelesaian per Bulan";
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const startMonthIdx = (quarter - 1) * 3;
            
            const monthsData = [
                { label: monthNames[startMonthIdx], completed: 0, monthIdx: startMonthIdx + 1 },
                { label: monthNames[startMonthIdx + 1], completed: 0, monthIdx: startMonthIdx + 2 },
                { label: monthNames[startMonthIdx + 2], completed: 0, monthIdx: startMonthIdx + 3 },
            ];
            
            for (const date of completedStores.values()) {
                const m = getJakartaMonth(date); 
                const bucket = monthsData.find(md => md.monthIdx === m);
                if (bucket) bucket.completed++;
            }
            
            listItems = monthsData.map(m => ({
                label: m.label,
                completed: m.completed,
                total: totalStoresCount,
                percentage: totalStoresCount === 0 ? 0 : Math.round((m.completed / totalStoresCount) * 100)
            }));
        }
    }

    return { 
        capaianNasional, 
        tercapai: totalCompleted, 
        belum: totalStoresCount - totalCompleted, 
        listTitle, 
        listItems 
    };
}
```

### Task 2: Build the UI Component

**Files:**
- Create: `app/dashboard/_components/admin/preventive-kpi-widget.tsx`

**Interfaces:**
- Consumes: `getAdminPreventiveKpiData` and types from `actions.ts`.

- [ ] **Step 1: Write the UI implementation**

Create `app/dashboard/_components/admin/preventive-kpi-widget.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminPreventiveKpiData, type PreventiveKpiData, type PreventiveQuarter } from "../../preventive/actions";
import { getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";

export function PreventiveKpiWidget({ branchNames }: { branchNames: string[] }) {
    const [quarter, setQuarter] = useState<PreventiveQuarter | "all">(getJakartaCurrentQuarter());
    const [branchName, setBranchName] = useState<string>("all");
    const [data, setData] = useState<PreventiveKpiData | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {
            getAdminPreventiveKpiData(getJakartaYear(), quarter, branchName).then(setData);
        });
    }, [quarter, branchName]);

    const pieData = data ? [
        { name: "Tercapai", value: data.capaianNasional, color: "#16a34a" },
        { name: "Belum", value: 100 - data.capaianNasional, color: "#fce7f3" }
    ] : [];

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Checklist Preventif</h3>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">CONTOH</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Capaian checklist preventif per cabang dan triwulan</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={branchName} onValueChange={setBranchName}>
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Semua Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Cabang</SelectItem>
                            {branchNames.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={quarter.toString()} onValueChange={(val) => setQuarter(val === "all" ? "all" : parseInt(val) as PreventiveQuarter)}>
                        <SelectTrigger className="w-[150px] h-9 text-xs">
                            <SelectValue placeholder="Semua Triwulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Triwulan</SelectItem>
                            <SelectItem value="1">Triwulan 1</SelectItem>
                            <SelectItem value="2">Triwulan 2</SelectItem>
                            <SelectItem value="3">Triwulan 3</SelectItem>
                            <SelectItem value="4">Triwulan 4</SelectItem>
                        </SelectContent>
                    </Select>

                    <Link href="/dashboard/preventive" className="text-xs text-primary hover:underline flex items-center ml-2">
                        Detail Preventif <ArrowUpRight className="h-3 w-3 ml-0.5" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="flex flex-col items-center">
                    <div className="text-sm font-medium mb-4 text-center">
                        {branchName === "all" ? "Capaian Nasional" : `Capaian Cabang ${branchName}`}
                    </div>
                    {data ? (
                        <>
                            <div className="relative h-48 w-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold">{data.capaianNasional}%</span>
                                    <span className="text-xs text-muted-foreground">capaian</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 mt-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                    <span>Tercapai {data.capaianNasional}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-pink-100"></div>
                                    <span>Belum {100 - data.capaianNasional}%</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-48 w-48 flex items-center justify-center text-sm text-muted-foreground">Memuat...</div>
                    )}
                </div>

                {/* List Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium">
                            {data ? data.listTitle : "Memuat..."}
                        </div>
                        {branchName === "all" && (
                            <Link href="/dashboard/preventive" className="text-xs text-primary hover:underline flex items-center">
                                Lihat semua <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </Link>
                        )}
                    </div>

                    <div className="space-y-4">
                        {data ? data.listItems.map((item, i) => {
                            let barColor = "bg-red-600";
                            
                            if (branchName !== "all" && quarter !== "all") {
                                // For Monthly pacing, Target per month is ~33%
                                if (item.percentage >= 30) barColor = "bg-green-600";
                                else if (item.percentage >= 15) barColor = "bg-orange-500";
                            } else {
                                // For overall compliance
                                if (item.percentage >= 60) barColor = "bg-orange-500";
                                if (item.percentage >= 80) barColor = "bg-green-600";
                            }

                            return (
                                <div key={item.label} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <div className="flex items-center gap-2 text-primary">
                                            {branchName === "all" && <span className="text-red-500">{i + 1}</span>}
                                            {item.label}
                                        </div>
                                        <span className="text-red-600">{item.percentage}% ({item.completed} Toko)</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-sm text-muted-foreground">Memuat data...</div>
                        )}
                        {data?.listItems.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">Data tidak tersedia.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### Task 3: Integrate into the Dashboard

**Files:**
- Modify: `app/dashboard/_components/manager-dashboard.tsx`
- Modify: `app/dashboard/_components/admin/admin-dashboard-v2.tsx`

- [ ] **Step 1: Inject to `manager-dashboard.tsx`**

Modify `app/dashboard/_components/manager-dashboard.tsx` to include `PreventiveKpiWidget`:

Add the import near the top:
```tsx
import { PreventiveKpiWidget } from "./admin/preventive-kpi-widget";
```

Render it below `KpiGrid` (around line 200+ where it renders `<KpiGrid data={data} />`):
```tsx
            {/* After KpiGrid */}
            <div className="mt-6">
                <PreventiveKpiWidget branchNames={data.metadata.branchNames} />
            </div>
```

- [ ] **Step 2: Inject to `admin-dashboard-v2.tsx`**

Modify `app/dashboard/_components/admin/admin-dashboard-v2.tsx` to include `PreventiveKpiWidget`:

Add the import near the top:
```tsx
import { PreventiveKpiWidget } from "./preventive-kpi-widget";
```

Render it below `AdminKpiCards` (around line 170+ where it renders `<AdminKpiCards data={data} />`):
```tsx
                <AdminKpiCards data={data} />
            </div>

            <div className="mt-6">
                <PreventiveKpiWidget branchNames={data.metadata.branchNames} />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
```
