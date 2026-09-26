# Process Duration per Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a "Durasi Proses per Tahapan" widget displaying the average time spent in 3 distinct stages (Estimasi to BMC, BMC to Manager, BMS Work Duration) using 'Jam dan Menit' (Hours and Minutes) format.

**Architecture:** A Server Action aggregates `ActivityLog` timestamps per report using PostgreSQL `EXTRACT(EPOCH FROM ...)` inside a CTE, then returns the average duration for each branch. A Client Component displays the 3 top-5 lists side-by-side.

**Tech Stack:** Next.js (App Router), Prisma, Tailwind CSS.

## Global Constraints

- Exclude "CONTOH" label from the UI.
- Use `Xj Ym` format for durations (e.g., "4j 20m") instead of days/decimal hours.

---

### Task 1: Create the Server Action for Duration Data

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Consumes: `getJakartaYearWindow`, `getJakartaQuarterWindow` from `@/lib/time`
- Produces: `getAdminProcessDurationData(year: number, quarter: PreventiveQuarter | "all")`

- [ ] **Step 1: Export Data Types in `actions.ts`**

Add these types around line 140:

```typescript
export type ProcessDurationItem = {
    branchName: string;
    durationSeconds: number;
    formattedDuration: string;
};

export type ProcessDurationData = {
    estimasiToBmc: ProcessDurationItem[];
    bmcToManager: ProcessDurationItem[];
    bmsWork: ProcessDurationItem[];
};
```

- [ ] **Step 2: Implement the `getAdminProcessDurationData` action**

Add this function to the bottom of `app/dashboard/preventive/actions.ts`:

```typescript
function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}j ${mins}m`;
}

export async function getAdminProcessDurationData(
    year: number,
    quarter: PreventiveQuarter | "all"
): Promise<ProcessDurationData> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }

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
        Prisma.sql`r."createdAt" >= ${qStart}`,
        Prisma.sql`r."createdAt" < ${qEnd}`,
    ];

    if (user.role === "ADMIN") {
        reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    // Raw SQL to compute durations
    const rows = await prisma.$queryRaw<{ 
        branchName: string; 
        avg_estimasi_bmc: number | null; 
        avg_bmc_bnm: number | null; 
        avg_bms_work: number | null; 
    }[]>`
        WITH report_events AS (
            SELECT 
                r."branchName",
                r."reportNumber",
                MAX(a."createdAt") FILTER (WHERE a.action IN ('SUBMITTED', 'RESUBMITTED_ESTIMATION')) AS estimasi_submit_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_APPROVED') AS bmc_estimasi_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_STARTED') AS bms_start_at,
                MAX(a."createdAt") FILTER (WHERE a.action IN ('COMPLETION_SUBMITTED', 'RESUBMITTED_WORK')) AS bms_complete_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_APPROVED') AS bmc_work_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'FINAL_APPROVED_BNM') AS bnm_approve_at
            FROM "Report" r
            JOIN "ActivityLog" a ON r."reportNumber" = a."reportNumber"
            WHERE ${Prisma.join(reportPredicates, " AND ")}
            GROUP BY r."branchName", r."reportNumber"
        )
        SELECT 
            "branchName",
            AVG(EXTRACT(EPOCH FROM (bmc_estimasi_approve_at - estimasi_submit_at))) AS avg_estimasi_bmc,
            AVG(EXTRACT(EPOCH FROM (bnm_approve_at - bmc_work_approve_at))) AS avg_bmc_bnm,
            AVG(EXTRACT(EPOCH FROM (bms_complete_at - bms_start_at))) AS avg_bms_work
        FROM report_events
        GROUP BY "branchName"
    `;

    // Map and format results
    const estimasiToBmc: ProcessDurationItem[] = [];
    const bmcToManager: ProcessDurationItem[] = [];
    const bmsWork: ProcessDurationItem[] = [];

    for (const row of rows) {
        if (row.avg_estimasi_bmc != null) {
            estimasiToBmc.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_estimasi_bmc),
                formattedDuration: formatDuration(Number(row.avg_estimasi_bmc))
            });
        }
        if (row.avg_bmc_bnm != null) {
            bmcToManager.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_bmc_bnm),
                formattedDuration: formatDuration(Number(row.avg_bmc_bnm))
            });
        }
        if (row.avg_bms_work != null) {
            bmsWork.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_bms_work),
                formattedDuration: formatDuration(Number(row.avg_bms_work))
            });
        }
    }

    // Sort descending by duration
    estimasiToBmc.sort((a, b) => b.durationSeconds - a.durationSeconds);
    bmcToManager.sort((a, b) => b.durationSeconds - a.durationSeconds);
    bmsWork.sort((a, b) => b.durationSeconds - a.durationSeconds);

    return {
        estimasiToBmc: estimasiToBmc.slice(0, 5),
        bmcToManager: bmcToManager.slice(0, 5),
        bmsWork: bmsWork.slice(0, 5),
    };
}
```

### Task 2: Build the ProcessDurationWidget UI Component

**Files:**
- Create: `app/dashboard/_components/admin/process-duration-widget.tsx`

**Interfaces:**
- Consumes: `getAdminProcessDurationData` and types from `actions.ts`.

- [ ] **Step 1: Write the UI implementation**

Create `app/dashboard/_components/admin/process-duration-widget.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminProcessDurationData, type ProcessDurationData, type PreventiveQuarter } from "../../preventive/actions";
import { getJakartaYear, getJakartaCurrentQuarter } from "@/lib/time";

export function ProcessDurationWidget() {
    const [quarter, setQuarter] = useState<PreventiveQuarter | "all">(getJakartaCurrentQuarter());
    const [data, setData] = useState<ProcessDurationData | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {
            getAdminProcessDurationData(getJakartaYear(), quarter).then(setData);
        });
    }, [quarter]);

    const renderCard = (title: string, subtitle: string, items: { branchName: string; formattedDuration: string }[] | undefined) => (
        <div className="rounded-lg border bg-card p-5 flex flex-col h-full shadow-sm">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">{subtitle}</p>
            
            <div className="flex justify-between text-xs font-medium text-muted-foreground border-b pb-2 mb-3">
                <span># &nbsp; Cabang</span>
                <span>Waktu</span>
            </div>
            
            <div className="space-y-3 flex-grow">
                {!items ? (
                    <div className="text-sm text-muted-foreground">Memuat...</div>
                ) : items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Data tidak tersedia</div>
                ) : (
                    items.map((item, i) => (
                        <div key={item.branchName} className="flex justify-between text-sm items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground w-4">{i + 1}</span>
                                <span className="font-medium text-red-600">{item.branchName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                                {item.formattedDuration}
                                <ArrowUpRight className="h-3 w-3" />
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <Link href="/dashboard/preventive" className="text-xs text-primary hover:underline flex items-center mt-6">
                Detail Tahapan <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </Link>
        </div>
    );

    return (
        <div className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold tracking-tight">Durasi Proses per Tahapan</h3>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">5 cabang dengan rata-rata durasi tertinggi (satuan: jam dan menit)</span>
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
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderCard(
                    "Estimasi → Approval BMC", 
                    "Durasi sejak BMS selesai estimasi hingga BMC approve", 
                    data?.estimasiToBmc
                )}
                {renderCard(
                    "Approval BMC → Approval Manager", 
                    "Durasi sejak approval BMC hingga manager approve", 
                    data?.bmcToManager
                )}
                {renderCard(
                    "Durasi Pengerjaan BMS", 
                    "Rata-rata waktu BMS menyelesaikan pekerjaan", 
                    data?.bmsWork
                )}
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

Modify `app/dashboard/_components/manager-dashboard.tsx`:

Add the import near the top:
```tsx
import { ProcessDurationWidget } from "./admin/process-duration-widget";
```

Render it directly below `<PreventiveKpiWidget />`:
```tsx
            <div className="mt-6">
                <PreventiveKpiWidget />
            </div>

            <ProcessDurationWidget />
```

- [ ] **Step 2: Inject to `admin-dashboard-v2.tsx`**

Modify `app/dashboard/_components/admin/admin-dashboard-v2.tsx`:

Add the import near the top:
```tsx
import { ProcessDurationWidget } from "./process-duration-widget";
```

Render it directly below `<PreventiveKpiWidget />`:
```tsx
      {/* Row 3: Preventif */}
      <PreventiveKpiWidget />
      
      <ProcessDurationWidget />
```
