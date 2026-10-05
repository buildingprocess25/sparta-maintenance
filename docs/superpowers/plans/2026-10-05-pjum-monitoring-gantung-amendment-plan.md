# Monitoring Laporan Gantung - Auto-load & Layout Amendment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the missing sidebar by wrapping the page in `AdminDashboardShell`, auto-load the data on mount, and implement an in-memory cache in the Server Action to prevent database strain.

**Architecture:** 
1. `page.tsx` becomes a Server Component that fetches the user and renders `AdminDashboardShell`.
2. The UI logic moves to a Client Component `_components/monitoring-gantung-content.tsx` which triggers a load on mount using `useEffect`.
3. `actions.ts` stores the query result in a Node.js global variable cache (with a 1-hour TTL) based on the exact start and end date strings.

**Tech Stack:** Next.js App Router, Prisma, React.

## Global Constraints

- Must retain the `HEAD OFFICE` exclusions and 0-value exclusions.
- Use `globalThis` for the cache to survive Next.js dev server reloads gracefully.

---

### Task 1: Update Server Action with Caching

**Files:**
- Modify: `app/dashboard/pjum/monitoring-gantung/actions.ts:25-30`

**Interfaces:**
- Modifies: `getMonitoringGantungData` to check and set an in-memory cache.

- [ ] **Step 1: Write the cache logic in the action**

```typescript
// Replace the start of the getMonitoringGantungData function:
export async function getMonitoringGantungData(startDateStr: string, endDateStr: string): Promise<MonitoringGantungResult> {
    const cacheKey = `${startDateStr}_${endDateStr}`;
    const globalAny = global as any;
    
    // Check Cache (1 Hour TTL)
    if (globalAny.monitoringGantungCache && globalAny.monitoringGantungCache.key === cacheKey) {
        const age = Date.now() - globalAny.monitoringGantungCache.timestamp;
        if (age < 60 * 60 * 1000) {
            console.log("Serving from cache...");
            return globalAny.monitoringGantungCache.data;
        }
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
```

- [ ] **Step 2: Save cache before returning**

```typescript
    // Replace the return statement at the end of the function:
    const result = {
        bmcBelum: Array.from(sheets.bmcBelum.values()),
        bnmBelum: Array.from(sheets.bnmBelum.values()),
        gantungReal: Array.from(sheets.gantungReal.values())
    };

    globalAny.monitoringGantungCache = {
        key: cacheKey,
        timestamp: Date.now(),
        data: result
    };

    return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/actions.ts
git commit -m "perf: add in-memory caching to monitoring gantung action"
```

---

### Task 2: Create Client Component for Content

**Files:**
- Create: `app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx`

**Interfaces:**
- Consumes: `getMonitoringGantungData` from `../actions.ts`.

- [ ] **Step 1: Move the old page.tsx content into this client component and add auto-load**

Create the file and copy the exact `page.tsx` UI, but add a `useEffect` for auto-load.

```tsx
"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMonitoringGantungData, MonitoringGantungResult, HangingDataRow } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function MonitoringGantungContent() {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<MonitoringGantungResult | null>(null);

    const handleLoadData = async (start: string, end: string) => {
        if (!start || !end) return toast.error("Pilih rentang tanggal terlebih dahulu");
        setIsLoading(true);
        try {
            const res = await getMonitoringGantungData(start, end);
            setData(res);
        } catch (error) {
            toast.error("Gagal memuat data");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto load on mount
    useEffect(() => {
        handleLoadData(startDate, endDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleExport = () => {
        if (!data) return;
        
        const wb = xlsx.utils.book_new();
        const formatRupiah = (num: number) => "Rp" + num.toLocaleString('id-ID');
        
        const generateSheet = (sheetName: string, dataArray: HangingDataRow[], title: string) => {
            const rows: any[][] = [];
            rows.push([title, null, null, null, null, null, null, null, null]);
            rows.push([
                `Tarikan dari web periode laporan dibuat ${startDate} - ${endDate}. Format Per BMS. Laporan Rp0 diabaikan.`,
                null, null, null, null, null, null, null, null
            ]);
            rows.push([null, null, null, null, null, null, null, null, null]);
            rows.push([
                "NIK BMS", "Nama BMS", "Cabang", "PJUM terakhir dibuat",
                "Periode Gantung 0-7 Hari", "Periode Gantung 8-14 Hari",
                "Periode Gantung 15-21 Hari", "Periode Gantung 22-28 Hari", "Periode Gantung >28 Hari"
            ]);

            for (const info of dataArray) {
                const formatBucket = (reps: {reportNumber: string, total: number}[]) => {
                    if (reps.length === 0) return "-";
                    const sum = reps.reduce((acc, r) => acc + r.total, 0);
                    let str = `${reps.length} laporan | Total ${formatRupiah(sum)}\r\n`;
                    str += reps.map(r => `${r.reportNumber} — ${formatRupiah(r.total)}`).join("\r\n");
                    return str;
                };

                rows.push([
                    info.nik, info.name, info.branch,
                    info.latestPjumDate ? new Date(info.latestPjumDate).toLocaleString('id-ID') : "-",
                    formatBucket(info.buckets['0-7 Hari']), formatBucket(info.buckets['8-14 Hari']),
                    formatBucket(info.buckets['15-21 Hari']), formatBucket(info.buckets['22-28 Hari']),
                    formatBucket(info.buckets['>28 Hari']),
                ]);
            }
            const ws = xlsx.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
            
            const range = xlsx.utils.decode_range(ws['!ref'] || "A1:I1");
            for (let R = 4; R <= range.e.r; ++R) {
                for (let C = 4; C <= 8; ++C) {
                    const cell_ref = xlsx.utils.encode_cell({ c: C, r: R });
                    if (ws[cell_ref]) ws[cell_ref].s = { alignment: { wrapText: true, vertical: 'top' } };
                }
            }
            xlsx.utils.book_append_sheet(wb, ws, sheetName);
        };

        generateSheet("1 BMC Belum", data.bmcBelum, "BMS oke, BMC belum, BNM belum");
        generateSheet("2 BNM Belum", data.bnmBelum, "BMS oke, BMC oke, BNM belum");
        generateSheet("3 Gantung Real", data.gantungReal, "BMS oke, BMC oke, BNM oke, gantung real belum PJUM");

        xlsx.writeFile(wb, `Laporan-Gantung-${startDate}-to-${endDate}.xlsx`);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-lg border">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tanggal Mulai (Dibuat)</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tanggal Akhir (Dibuat)</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button onClick={() => handleLoadData(startDate, endDate)} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load Data
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={!data || isLoading}>
                    Export Excel
                </Button>
            </div>
            
            {data && (
                <Tabs defaultValue="gantungReal" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="bmcBelum">BMC Belum ({data.bmcBelum.filter(b => Object.values(b.buckets).some(arr => arr.length > 0)).length} BMS)</TabsTrigger>
                        <TabsTrigger value="bnmBelum">BNM Belum ({data.bnmBelum.filter(b => Object.values(b.buckets).some(arr => arr.length > 0)).length} BMS)</TabsTrigger>
                        <TabsTrigger value="gantungReal">Gantung Real ({data.gantungReal.filter(b => Object.values(b.buckets).some(arr => arr.length > 0)).length} BMS)</TabsTrigger>
                    </TabsList>
                    
                    {([ 
                        { value: 'bmcBelum', title: 'BMC Belum', items: data.bmcBelum },
                        { value: 'bnmBelum', title: 'BNM Belum', items: data.bnmBelum },
                        { value: 'gantungReal', title: 'Gantung Real', items: data.gantungReal }
                    ] as const).map(tab => (
                        <TabsContent key={tab.value} value={tab.value} className="bg-card rounded-lg border">
                            <div className="overflow-auto max-h-[600px]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary">
                                        <TableRow>
                                            <TableHead className="min-w-[120px]">NIK</TableHead>
                                            <TableHead className="min-w-[200px]">Nama BMS</TableHead>
                                            <TableHead>Cabang</TableHead>
                                            <TableHead>0-7 Hari</TableHead>
                                            <TableHead>8-14 Hari</TableHead>
                                            <TableHead>15-21 Hari</TableHead>
                                            <TableHead>22-28 Hari</TableHead>
                                            <TableHead>&gt;28 Hari</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tab.items.map((row) => (
                                            <TableRow key={row.nik}>
                                                <TableCell className="font-medium">{row.nik}</TableCell>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.branch}</TableCell>
                                                {(['0-7 Hari', '8-14 Hari', '15-21 Hari', '22-28 Hari', '>28 Hari'] as const).map(bucketKey => (
                                                    <TableCell key={bucketKey} className="align-top min-w-[250px]">
                                                        {row.buckets[bucketKey].length === 0 ? (
                                                            <span className="text-muted-foreground">-</span>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <div className="font-semibold text-xs border-b pb-1">
                                                                    {row.buckets[bucketKey].length} laporan | Rp{row.buckets[bucketKey].reduce((sum, r) => sum + r.total, 0).toLocaleString('id-ID')}
                                                                </div>
                                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                                    {row.buckets[bucketKey].map(r => (
                                                                        <li key={r.reportNumber}>{r.reportNumber} - Rp{r.total.toLocaleString('id-ID')}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx
git commit -m "feat: extract monitoring gantung content to client component with auto-load"
```

---

### Task 3: Rewrite Server Page

**Files:**
- Modify: `app/dashboard/pjum/monitoring-gantung/page.tsx`

**Interfaces:**
- Consumes: `AdminDashboardShell` from `app/dashboard/_components/admin/admin-dashboard-shell`
- Consumes: `MonitoringGantungContent`

- [ ] **Step 1: Rewrite page as Server Component with Shell**

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authorization";
import { AdminDashboardShell } from "../../_components/admin/admin-dashboard-shell";
import { MonitoringGantungContent } from "./_components/monitoring-gantung-content";

export const dynamic = "force-dynamic";

export default async function MonitoringGantungPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    
    // Only Admin, BMC, BNM_MANAGER should access this
    if (
        user.role !== "ADMIN" &&
        user.role !== "BMC" &&
        user.role !== "BNM_MANAGER"
    ) {
        redirect("/dashboard");
    }

    return (
        <AdminDashboardShell
            user={user}
            title="Monitoring Laporan Gantung"
            breadcrumbs={[
                { label: "Dokumen PJUM", href: "/dashboard/pjum" },
                { label: "Monitoring Gantung" }
            ]}
            contentClassName="h-full p-0 flex flex-col"
        >
            <MonitoringGantungContent />
        </AdminDashboardShell>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/page.tsx
git commit -m "feat: wrap monitoring gantung page in admin shell"
```
