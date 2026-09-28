# Detailed SLA Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a detailed SLA breakdown table grouped by Branch and BMS on the "Performa Cabang" page, accessible via a new tab. Update the dashboard widget to point to this tab.

**Architecture:** 
1. New server action in `app/dashboard/branches/actions.ts` to compute SLA averages via CTE.
2. New `AdminSLATable` component using an accordion UI.
3. Introduce Next.js standard Tabs to `app/dashboard/branches/page.tsx`.
4. Update link in `app/dashboard/_components/admin/process-duration-widget.tsx`.

**Tech Stack:** Next.js Server Actions, Prisma raw SQL, Tailwind, Radix UI Tabs.

## Global Constraints

- No changes to existing functions in `actions.ts`, only additions.
- Must use existing formatting functions like `formatDuration` or create a similar one if needed.
- `Tabs` must support URL parameters (`?tab=sla`) for direct linking.

---

### Task 1: Backend Action for Detailed SLA

**Files:**
- Modify: `app/dashboard/branches/actions.ts`

**Interfaces:**
- Produces: `getAdminDetailedSLAData(period, brand)` returning structured data grouped by branch and BMS.

- [ ] **Step 1: Write the SLA data action**

Add the following to the end of `app/dashboard/branches/actions.ts`:

```typescript
import { Prisma } from "@prisma/client";

export type SLADurationBMS = {
    bmsName: string;
    estimasiToAppvBMC: number | null;
    estimasiToRevisiBMC: number | null;
    appvBMCToWorkStart: number | null;
    workStartToRealisasi: number | null;
    realisasiToRevisiBMC: number | null;
    realisasiToAppvBMC: number | null;
    appvBMCToAppvMGR: number | null;
};

export type SLADurationBranch = {
    branchName: string;
    bmsList: SLADurationBMS[];
};

export async function getAdminDetailedSLAData(
    period: string,
    brandFilter: StoreBrandFilter,
): Promise<SLADurationBranch[]> {
    const user = await getAuthUser();
    if (!user || !["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)) {
        throw new Error("Unauthorized");
    }

    const { start, endExclusive } = getPeriodWindow(period);

    const predicates: Prisma.Sql[] = [
        Prisma.sql`r."createdAt" >= ${start}`,
        Prisma.sql`r."createdAt" < ${endExclusive}`,
    ];

    if (user.role === "ADMIN") {
        predicates.push(Prisma.sql`r."branchName" <> 'ADMIN_BRANCH'`);
        if (brandFilter !== "ALL") {
            const brand = parseStoreBrandFilter(brandFilter);
            if (brand) {
                predicates.push(Prisma.sql`s."brand" = ${brand}`);
            }
        }
    } else if (user.branchNames.length > 0) {
        predicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    const rows = await prisma.$queryRaw<{
        branchName: string;
        bmsName: string;
        avg_est_to_appv_bmc: number | null;
        avg_est_to_rev_bmc: number | null;
        avg_appv_bmc_to_start: number | null;
        avg_start_to_realisasi: number | null;
        avg_realisasi_to_rev_bmc: number | null;
        avg_realisasi_to_appv_bmc: number | null;
        avg_appv_bmc_to_mgr: number | null;
    }[]>`
        WITH report_events AS (
            SELECT 
                r."branchName",
                u."name" AS "bmsName",
                r."reportNumber",
                MAX(a."createdAt") FILTER (WHERE a.action IN ('SUBMITTED', 'RESUBMITTED_ESTIMATION')) AS t_submit,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_APPROVED') AS t_est_appv,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_REJECTED_REVISION') AS t_est_rev,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_STARTED') AS t_start,
                MAX(a."createdAt") FILTER (WHERE a.action IN ('COMPLETION_SUBMITTED', 'RESUBMITTED_WORK')) AS t_realisasi,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_REJECTED_REVISION') AS t_real_rev,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_APPROVED') AS t_real_appv,
                MAX(a."createdAt") FILTER (WHERE a.action = 'FINAL_APPROVED_BNM') AS t_mgr_appv
            FROM "Report" r
            JOIN "User" u ON r."bmsNIK" = u."NIK"
            LEFT JOIN "Store" s ON r."storeCode" = s.code
            JOIN "ActivityLog" a ON r."reportNumber" = a."reportNumber"
            WHERE ${Prisma.join(predicates, " AND ")}
            GROUP BY r."branchName", u."name", r."reportNumber"
        )
        SELECT 
            "branchName",
            "bmsName",
            AVG(EXTRACT(EPOCH FROM (t_est_appv - t_submit))) AS avg_est_to_appv_bmc,
            AVG(EXTRACT(EPOCH FROM (t_est_rev - t_submit))) AS avg_est_to_rev_bmc,
            AVG(EXTRACT(EPOCH FROM (t_start - t_est_appv))) AS avg_appv_bmc_to_start,
            AVG(EXTRACT(EPOCH FROM (t_realisasi - t_start))) AS avg_start_to_realisasi,
            AVG(EXTRACT(EPOCH FROM (t_real_rev - t_realisasi))) AS avg_realisasi_to_rev_bmc,
            AVG(EXTRACT(EPOCH FROM (t_real_appv - t_realisasi))) AS avg_realisasi_to_appv_bmc,
            AVG(EXTRACT(EPOCH FROM (t_mgr_appv - t_real_appv))) AS avg_appv_bmc_to_mgr
        FROM report_events
        GROUP BY "branchName", "bmsName"
        ORDER BY "branchName", "bmsName"
    `;

    const branchMap = new Map<string, SLADurationBMS[]>();

    for (const row of rows) {
        if (!branchMap.has(row.branchName)) {
            branchMap.set(row.branchName, []);
        }
        branchMap.get(row.branchName)!.push({
            bmsName: row.bmsName,
            estimasiToAppvBMC: row.avg_est_to_appv_bmc ? Number(row.avg_est_to_appv_bmc) : null,
            estimasiToRevisiBMC: row.avg_est_to_rev_bmc ? Number(row.avg_est_to_rev_bmc) : null,
            appvBMCToWorkStart: row.avg_appv_bmc_to_start ? Number(row.avg_appv_bmc_to_start) : null,
            workStartToRealisasi: row.avg_start_to_realisasi ? Number(row.avg_start_to_realisasi) : null,
            realisasiToRevisiBMC: row.avg_realisasi_to_rev_bmc ? Number(row.avg_realisasi_to_rev_bmc) : null,
            realisasiToAppvBMC: row.avg_realisasi_to_appv_bmc ? Number(row.avg_realisasi_to_appv_bmc) : null,
            appvBMCToAppvMGR: row.avg_appv_bmc_to_mgr ? Number(row.avg_appv_bmc_to_mgr) : null,
        });
    }

    const result: SLADurationBranch[] = [];
    for (const [branchName, bmsList] of branchMap.entries()) {
        result.push({ branchName, bmsList });
    }

    return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/actions.ts
git commit -m "feat(dashboard): add action for detailed SLA data grouped by branch and BMS"
```

### Task 2: Create SLA Table Component

**Files:**
- Create: `app/dashboard/branches/_components/admin-sla-table.tsx`

**Interfaces:**
- Consumes: `SLADurationBranch[]` from `actions.ts`.

- [ ] **Step 1: Write the component**

Create `app/dashboard/branches/_components/admin-sla-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { SLADurationBranch, SLADurationBMS } from "../actions";

function formatDuration(seconds: number | null): string {
    if (seconds === null) return "-";
    if (seconds < 0) return "-"; // Safeguard against weird data
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    
    // Formatting match with the screenshot (e.g. 04:44:21) -> we can use HH:mm:ss
    // Wait, screenshot shows HH:mm:ss. We'll implement that.
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.round(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
}

export function AdminSLATable({ data }: { data: SLADurationBranch[] }) {
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

    const toggleBranch = (branchName: string) => {
        const next = new Set(expandedBranches);
        if (next.has(branchName)) next.delete(branchName);
        else next.add(branchName);
        setExpandedBranches(next);
    };

    return (
        <div className="space-y-4 min-w-0">
            <div className="border-b pb-2">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">SLA Proses SPARTA</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Rata-rata durasi proses per tahapan dikelompokkan per BMS.</p>
            </div>
            
            <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
                <div className="w-full overflow-x-auto">
                    <Table className="text-xs [&_td]:py-2 [&_th]:py-2 border-collapse">
                        <TableHeader className="bg-orange-100/50">
                            <TableRow className="divide-x divide-border/50">
                                <TableHead className="min-w-[200px] font-bold text-black border-r border-border/50">Nama Cabang / BMS</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PENGAJUAN ESTIMASI - APPV ESTIMASI BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PENGAJUAN ESTIMASI - REVISI ESTIMASI BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">APPV ESTIMASI BMC - MULAI DIKERJAKAN BMS</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">PEKERJAAN DIMULAI - REALISASI DIAJUKAN</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">REALISASI DIAJUKAN - REVISI PEKERJAAN OLEH BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black border-r border-border/50 whitespace-pre-wrap">REALISASI DIAJUKAN - APPV BMC</TableHead>
                                <TableHead className="min-w-[130px] font-bold text-center text-black">APPV BMC - APPV MGR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                                        Tidak ada data SLA.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((branch) => {
                                    const isExpanded = expandedBranches.has(branch.branchName);
                                    return (
                                        <React.Fragment key={branch.branchName}>
                                            <TableRow 
                                                className="cursor-pointer bg-muted/20 hover:bg-muted/40 divide-x divide-border/50" 
                                                onClick={() => toggleBranch(branch.branchName)}
                                            >
                                                <TableCell colSpan={8} className="font-semibold text-primary py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        {branch.branchName} ({branch.bmsList.length} BMS)
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            
                                            {isExpanded && branch.bmsList.map((bms) => (
                                                <TableRow key={`${branch.branchName}-${bms.bmsName}`} className="divide-x divide-border/50 bg-background hover:bg-muted/10">
                                                    <TableCell className="pl-8 font-medium">{bms.bmsName}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.estimasiToAppvBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.estimasiToRevisiBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.appvBMCToWorkStart)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.workStartToRealisasi)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.realisasiToRevisiBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.realisasiToAppvBMC)}</TableCell>
                                                    <TableCell className="text-center font-mono">{formatDuration(bms.appvBMCToAppvMGR)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/_components/admin-sla-table.tsx
git commit -m "feat(dashboard): add detailed SLA accordion table component"
```

### Task 3: Integrate Tabs into Branches Page

**Files:**
- Modify: `app/dashboard/branches/page.tsx`

**Interfaces:**
- Consumes: Both tables, `data` from branches, `slaData` from new action.

- [ ] **Step 1: Write the integration**

Replace the content of `app/dashboard/branches/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../_components/admin/admin-dashboard-shell";
import { AdminTrendPeriodFilter } from "../_components/admin/admin-trend-filter";
import { AdminBranchesTable } from "./_components/admin-branches-table";
import { getAdminBranchesData, getAdminDetailedSLAData } from "./actions";
import { normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSLATable } from "./_components/admin-sla-table";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ period?: string | string[]; brand?: string; tab?: string }>
};

function normalizePeriod(value?: string | string[]) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw && /^\d{2}-\d{4}$/.test(raw)) return raw;
    return "ytd";
}

export default async function AdminBranchesPage({ searchParams }: Props) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    if (!["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)) {
        redirect("/dashboard");
    }

    const params = await searchParams;
    const period = normalizePeriod(params.period);
    const brand = user.role === "ADMIN"
        ? normalizeStoreBrandFilter(params.brand)
        : "ALL";
    const activeTab = params.tab === "sla" ? "sla" : "ringkasan";
        
    const [data, slaData] = await Promise.all([
        getAdminBranchesData(period, brand),
        getAdminDetailedSLAData(period, brand)
    ]);

    return (
        <AdminDashboardShell
            user={user}
            title="Performa Cabang"
            breadcrumbs={[{ label: "Performa Cabang" }]}
            headerActions={
                <AdminTrendPeriodFilter
                    initialPeriod={period}
                    initialBrand={brand}
                    showBrandFilter={user.role === "ADMIN"}
                    basePath="/dashboard/branches"
                />
            }
            contentClassName="h-full flex flex-col min-h-0 p-0"
        >
            <Tabs defaultValue={activeTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-6 pb-2 border-b">
                    <TabsList>
                        <TabsTrigger value="ringkasan">Ringkasan Operasional</TabsTrigger>
                        <TabsTrigger value="sla">SLA Proses</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="ringkasan" className="flex-1 overflow-y-auto p-6 mt-0">
                    <AdminBranchesTable data={data} brand={brand} />
                </TabsContent>
                
                <TabsContent value="sla" className="flex-1 overflow-y-auto p-6 mt-0">
                    <AdminSLATable data={slaData} />
                </TabsContent>
            </Tabs>
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/branches/page.tsx
git commit -m "feat(dashboard): integrate SLA tabs into performa cabang page"
```

### Task 4: Update Widget Link

**Files:**
- Modify: `app/dashboard/_components/admin/process-duration-widget.tsx`

**Interfaces:**
- N/A

- [ ] **Step 1: Update the link**

Find `href="/dashboard/preventive"` around line 73 in `app/dashboard/_components/admin/process-duration-widget.tsx` and change it to:
```tsx
                    href="/dashboard/branches?tab=sla" 
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/admin/process-duration-widget.tsx
git commit -m "fix(dashboard): update process duration widget link to SLA tab"
```
