# BMS Preventive Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dashboard summary card and a new tabbed detail page for BMS users to easily track their preventive maintenance completion for the current quarter.

**Architecture:** 
1. **Data Layer:** Extend `app/dashboard/preventive/actions.ts` to include a new Server Action `getBmsPreventiveCoverage` that fetches the stores assigned to the BMS and evaluates their preventive status for the current quarter using the existing SQL logic.
2. **Dashboard Component:** Create a `BmsPreventiveCard` component displaying a progress ring and summary text. Integrate this into `BmsDashboard`.
3. **Detail Page:** Create a new page at `app/dashboard/coverage/page.tsx` wrapped in `BmsMobilePage` that presents a tabbed view ("Belum Preventif" and "Sudah Preventif") of the BMS's stores, allowing direct navigation to create a new report for pending stores.

**Tech Stack:** Next.js App Router, Prisma (Raw SQL for performance), Tailwind CSS, Lucide React, shadcn/ui components (Tabs, Card, Progress).

## Global Constraints

- Must follow mobile-first UI design as BMS users access this via mobile devices.
- Code must be written in TypeScript with strict typing.
- Use `lucide-react` for icons.
- Must not break the existing Admin/BMC `preventive` dashboard.

---

### Task 1: Create Data Fetching Logic

**Files:**
- Modify: `app/dashboard/preventive/actions.ts`

**Interfaces:**
- Produces: `getBmsPreventiveCoverage(user: AuthUser)` returning `{ completed: StoreWithStatus[], pending: StoreWithStatus[], total: number, completionRate: number }`

- [ ] **Step 1: Write the implementation**

Add the `getBmsPreventiveCoverage` function at the bottom of `app/dashboard/preventive/actions.ts`.

```typescript
import { completePreventiveEvidenceSql } from "@/lib/report-preventive-sql";
import { getJakartaCurrentQuarter, getJakartaYear } from "@/lib/time";

export type BmsStoreCoverage = {
    storeCode: string;
    storeName: string;
    brand: string | null;
    isCompleted: boolean;
    reportNumber?: string;
    doneAt?: string;
};

export type BmsPreventiveCoverageResult = {
    completed: BmsStoreCoverage[];
    pending: BmsStoreCoverage[];
    total: number;
    completionRate: number;
    quarterLabel: string;
};

export async function getBmsPreventiveCoverage(user: { NIK: string; branchNames: string[] }): Promise<BmsPreventiveCoverageResult> {
    const year = getJakartaYear();
    const quarter = getJakartaCurrentQuarter();
    const quarterLabels: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
    
    // Define quarter date ranges
    let startDate = "";
    let endDate = "";
    if (quarter === 1) { startDate = `${year}-01-01`; endDate = `${year}-03-31`; }
    else if (quarter === 2) { startDate = `${year}-04-01`; endDate = `${year}-06-30`; }
    else if (quarter === 3) { startDate = `${year}-07-01`; endDate = `${year}-09-30`; }
    else { startDate = `${year}-10-01`; endDate = `${year}-12-31`; }

    // Use Prisma raw query to get stores and their preventive status for the current quarter
    const branchNamesList = user.branchNames.map(b => `'${b}'`).join(",");
    const branchFilter = branchNamesList.length > 0 ? `AND s."branchName" IN (${branchNamesList})` : "";

    const sql = `
        WITH QuarterReports AS (
            SELECT 
                r."storeCode",
                r."reportNumber",
                r."finishedAt"
            FROM "Report" r
            WHERE r.status = 'COMPLETED'
              AND r."finishedAt" >= '${startDate} 00:00:00+07'::timestamptz
              AND r."finishedAt" <= '${endDate} 23:59:59+07'::timestamptz
              AND (${completePreventiveEvidenceSql('r')})
        ),
        RankedReports AS (
            SELECT 
                "storeCode",
                "reportNumber",
                "finishedAt",
                ROW_NUMBER() OVER(PARTITION BY "storeCode" ORDER BY "finishedAt" DESC) as rn
            FROM QuarterReports
        )
        SELECT 
            s.code as "storeCode",
            s.name as "storeName",
            s.brand,
            rr."reportNumber",
            rr."finishedAt" as "doneAt"
        FROM "Store" s
        LEFT JOIN RankedReports rr ON s.code = rr."storeCode" AND rr.rn = 1
        WHERE s."isActive" = true
        ${branchFilter}
        ORDER BY s.code ASC;
    `;

    const rawRows = await prisma.$queryRawUnsafe<any[]>(sql);

    const completed: BmsStoreCoverage[] = [];
    const pending: BmsStoreCoverage[] = [];

    for (const row of rawRows) {
        const item: BmsStoreCoverage = {
            storeCode: row.storeCode,
            storeName: row.storeName,
            brand: row.brand,
            isCompleted: !!row.reportNumber,
            reportNumber: row.reportNumber || undefined,
            doneAt: row.doneAt ? row.doneAt.toISOString() : undefined,
        };

        if (item.isCompleted) {
            completed.push(item);
        } else {
            pending.push(item);
        }
    }

    const total = completed.length + pending.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    return {
        completed,
        pending,
        total,
        completionRate,
        quarterLabel: quarterLabels[quarter] + " " + year
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/preventive/actions.ts
git commit -m "feat(bms): add getBmsPreventiveCoverage data fetching"
```

---

### Task 2: Create Dashboard Progress Card Component

**Files:**
- Create: `app/dashboard/_components/bms-preventive-card.tsx`

**Interfaces:**
- Consumes: `BmsPreventiveCoverageResult` from `actions.ts`
- Produces: `<BmsPreventiveCard coverage={...} />` component.

- [ ] **Step 1: Write the component implementation**

Create `app/dashboard/_components/bms-preventive-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronRight } from "lucide-react";
import type { BmsPreventiveCoverageResult } from "../preventive/actions";

export function BmsPreventiveCard({ coverage }: { coverage: BmsPreventiveCoverageResult }) {
    const { completed, total, completionRate, quarterLabel } = coverage;

    return (
        <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        Target Preventif {quarterLabel}
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                        {completed.length} <span className="text-sm font-normal text-muted-foreground">/ {total} Toko</span>
                    </div>
                    <div className="w-full bg-primary/20 rounded-full h-2 mt-2 overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                            style={{ width: \`\${completionRate}%\` }}
                        />
                    </div>
                </div>
                
                <div className="flex flex-col items-center justify-center">
                    <div className="text-xl font-bold text-primary">{completionRate}%</div>
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 mt-1 text-xs text-primary hover:bg-primary/10">
                        <Link href="/dashboard/coverage">
                            Lihat Detail
                            <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/bms-preventive-card.tsx
git commit -m "feat(bms): create preventive progress card component"
```

---

### Task 3: Integrate Card into BMS Dashboard

**Files:**
- Modify: `app/dashboard/_components/bms-dashboard.tsx`

**Interfaces:**
- Consumes: `<BmsPreventiveCard />` and `getBmsPreventiveCoverage`

- [ ] **Step 1: Modify `bms-dashboard.tsx`**

Import the action and the component. Update the `BmsDashboard` async component to fetch coverage and render it under the Welcome Card and above "Buat Laporan Baru" button.

```tsx
import { BmsPreventiveCard } from "./bms-preventive-card";
import { getBmsPreventiveCoverage } from "../preventive/actions";

// Inside BmsDashboard function:
export async function BmsDashboard({ user }: { user: AuthUser }) {
  const [stats, activities, coverage] = await Promise.all([
    getUserStats(user.NIK),
    getBMSActivity(user.NIK),
    getBmsPreventiveCoverage(user),
  ]);

  // ... (keep rest of initialization)

  return (
    <BmsMobilePage
      navItem="dashboard"
      userInitials={/* ... */}
    >
      <BmsWelcomeCard name={user.name} />

      <BmsPreventiveCard coverage={coverage} />

      <Button asChild size="lg" className="h-12 w-full">
        {/* ... */}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/bms-dashboard.tsx
git commit -m "feat(bms): integrate preventive card into dashboard"
```

---

### Task 4: Create Tabbed Detail Page (Coverage Page)

**Files:**
- Create: `app/dashboard/coverage/page.tsx`

**Interfaces:**
- Consumes: `getBmsPreventiveCoverage` and `BmsMobilePage` wrapper.

- [ ] **Step 1: Create `app/dashboard/coverage/page.tsx`**

Implement a tabbed interface separating pending and completed stores. Each store in the pending tab has a button linking to `/reports/create?storeCode=...`.

```tsx
import { requireAuth } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { getBmsPreventiveCoverage } from "../preventive/actions";
import { BmsMobilePage } from "@/components/bms-mobile/bms-mobile-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import { formatJakartaDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function BmsCoveragePage() {
    const user = await requireAuth();
    if (user.role !== "BMS") {
        redirect("/dashboard");
    }

    const coverage = await getBmsPreventiveCoverage(user);

    return (
        <BmsMobilePage
            navItem="dashboard"
            userInitials={user.name
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0]?.toUpperCase() ?? "")
                .join("")}
        >
            <div className="space-y-4">
                <div>
                    <h1 className="font-heading text-xl font-bold tracking-tight">Coverage Preventif</h1>
                    <p className="text-sm text-muted-foreground">Target {coverage.quarterLabel}: {coverage.completionRate}% Selesai</p>
                </div>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pending">
                            Belum ({coverage.pending.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            Sudah ({coverage.completed.length})
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pending" className="space-y-3 mt-4">
                        {coverage.pending.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Luar biasa! Semua toko sudah dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.pending.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shrink-0">
                                            Belum Preventif
                                        </Badge>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="w-full mt-1 border-primary/50 text-primary hover:bg-primary/5">
                                        <Link href={\`/reports/create?storeCode=\${store.storeCode}\`}>
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Buat Laporan Preventif
                                        </Link>
                                    </Button>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-3 mt-4">
                        {coverage.completed.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                Belum ada toko yang selesai dipreventif triwulan ini.
                            </div>
                        ) : (
                            coverage.completed.map((store) => (
                                <Card key={store.storeCode} className="p-4 flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="font-semibold">{store.storeCode} - {store.storeName}</div>
                                            {store.brand && <div className="text-xs text-muted-foreground mt-0.5">{store.brand}</div>}
                                        </div>
                                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none shrink-0">
                                            Selesai
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                        <span>No: {store.reportNumber}</span>
                                        <span>{store.doneAt ? formatJakartaDate(store.doneAt) : '-'}</span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </BmsMobilePage>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/coverage/page.tsx
git commit -m "feat(bms): add preventive coverage tabbed detail page"
```
