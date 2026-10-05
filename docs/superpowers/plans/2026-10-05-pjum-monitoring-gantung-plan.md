# Monitoring Laporan Gantung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin dashboard page to monitor hanging reports categorized into 3 tabs with an on-demand real-time fetching action and a client-side Excel export feature.

**Architecture:** A Server Action calculates and groups the data per BMS based on the specific business rules (createdAt filter, status checks, omitted PJUMs). The Client Component uses standard React state to hold the data, rendering it in a shadcn-ui Tabbed Table, and using `xlsx` to generate downloads without additional DB queries.

**Tech Stack:** Next.js App Router, Prisma, React, xlsx, shadcn/ui.

## Global Constraints

- Must exclude any BMS user or report with branch `HEAD OFFICE`.
- Ignore reports where `totalReal` is 0.
- Use `Date` objects correctly between Server Action (returns stringified or pure JSON) and Client.
- The UI should have a loading state to handle the heavy backend query gracefully.

---

### Task 1: Create the Server Action

**Files:**
- Create: `app/dashboard/pjum/monitoring-gantung/actions.ts`

**Interfaces:**
- Produces: `getMonitoringGantungData(startDate: string, endDate: string)` returning an object with `bmcBelum`, `bnmBelum`, `gantungReal` arrays.

- [ ] **Step 1: Write the server action scaffolding**

```typescript
"use server";
import prisma from "@/lib/prisma";

export async function getMonitoringGantungData(startDateStr: string, endDateStr: string) {
    // Implementation will go here
    return { bmcBelum: [], bnmBelum: [], gantungReal: [] };
}
```

- [ ] **Step 2: Implement the business logic for fetching and categorizing**

```typescript
"use server";
import prisma from "@/lib/prisma";

export type HangingDataRow = {
    nik: string;
    name: string;
    branch: string;
    latestPjumDate: string | null;
    buckets: {
        '0-7 Hari': { reportNumber: string, total: number }[];
        '8-14 Hari': { reportNumber: string, total: number }[];
        '15-21 Hari': { reportNumber: string, total: number }[];
        '22-28 Hari': { reportNumber: string, total: number }[];
        '>28 Hari': { reportNumber: string, total: number }[];
    }
};

export type MonitoringGantungResult = {
    bmcBelum: HangingDataRow[];
    bnmBelum: HangingDataRow[];
    gantungReal: HangingDataRow[];
};

export async function getMonitoringGantungData(startDateStr: string, endDateStr: string): Promise<MonitoringGantungResult> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Set to end of day for the end date if it isn't already
    endDate.setHours(23, 59, 59, 999);

    const bmsUsers = await prisma.user.findMany({
        where: { role: 'BMS' },
        select: { NIK: true, name: true, branchNames: true }
    });

    const bmsMap = new Map();
    const sheets = {
        bmcBelum: new Map<string, HangingDataRow>(),
        bnmBelum: new Map<string, HangingDataRow>(),
        gantungReal: new Map<string, HangingDataRow>()
    };

    for (const bms of bmsUsers) {
        const branch = bms.branchNames?.[0] ?? "-";
        if (branch === "HEAD OFFICE" || bms.branchNames.includes("HEAD OFFICE")) continue;

        const latestPjum = await prisma.pjumExport.findFirst({
            where: { bmsNIK: bms.NIK },
            orderBy: { createdAt: 'desc' }
        });
        
        bmsMap.set(bms.NIK, { ...bms, latestPjum });

        const createBaseInfo = (): HangingDataRow => ({
            nik: bms.NIK,
            name: bms.name,
            branch: branch,
            latestPjumDate: latestPjum ? latestPjum.createdAt.toISOString() : null,
            buckets: {
                '0-7 Hari': [],
                '8-14 Hari': [],
                '15-21 Hari': [],
                '22-28 Hari': [],
                '>28 Hari': []
            }
        });

        sheets.bmcBelum.set(bms.NIK, createBaseInfo());
        sheets.bnmBelum.set(bms.NIK, createBaseInfo());
        sheets.gantungReal.set(bms.NIK, createBaseInfo());
    }

    const reports = await prisma.report.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['PENDING_REVIEW', 'APPROVED_BMC', 'COMPLETED'] }
        },
        include: {
            createdBy: { select: { NIK: true, name: true, branchNames: true } }
        }
    });

    const getBucket = (date: Date) => {
        const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 7) return '0-7 Hari';
        if (diff <= 14) return '8-14 Hari';
        if (diff <= 21) return '15-21 Hari';
        if (diff <= 28) return '22-28 Hari';
        return '>28 Hari';
    };

    for (const report of reports) {
        const total = Number(report.totalReal) || 0;
        if (total === 0) continue;

        const reportBranch = report.branchName || "-";
        if (reportBranch === "HEAD OFFICE") continue;

        const bmsInfo = bmsMap.get(report.createdBy.NIK);
        if (!bmsInfo) continue;

        const latestPjum = bmsInfo.latestPjum;
        let targetSheetName: keyof typeof sheets | null = null;
        let baseDate: Date | null = null;

        if (report.status === 'PENDING_REVIEW') {
            targetSheetName = "bmcBelum";
            baseDate = report.updatedAt;
        } else if (report.status === 'APPROVED_BMC') {
            targetSheetName = "bnmBelum";
            baseDate = report.updatedAt;
        } else if (report.status === 'COMPLETED' && report.pjumExportedAt === null) {
            if (latestPjum && report.finishedAt && report.finishedAt < latestPjum.createdAt) {
                targetSheetName = "gantungReal";
                baseDate = report.finishedAt;
            }
        }

        if (targetSheetName && baseDate) {
            const targetSheet = sheets[targetSheetName];
            if (targetSheet.has(bmsInfo.NIK)) {
                const bucket = getBucket(baseDate);
                targetSheet.get(bmsInfo.NIK)!.buckets[bucket].push({
                    reportNumber: report.reportNumber,
                    total
                });
            }
        }
    }

    return {
        bmcBelum: Array.from(sheets.bmcBelum.values()),
        bnmBelum: Array.from(sheets.bnmBelum.values()),
        gantungReal: Array.from(sheets.gantungReal.values())
    };
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/actions.ts
git commit -m "feat: add server action for monitoring gantung"
```

---

### Task 2: Create the Dashboard Page and UI

**Files:**
- Create: `app/dashboard/pjum/monitoring-gantung/page.tsx`

**Interfaces:**
- Consumes: `getMonitoringGantungData` from `actions.ts`.

- [ ] **Step 1: Write the basic page layout with state**

```tsx
"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMonitoringGantungData, MonitoringGantungResult, HangingDataRow } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function MonitoringGantungPage() {
    // Default to last 30 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<MonitoringGantungResult | null>(null);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Monitoring Laporan Gantung</h1>
                <p className="text-muted-foreground">Pantau laporan yang belum diselesaikan atau tertinggal dari PJUM.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-lg border">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tanggal Mulai (Dibuat)</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tanggal Akhir (Dibuat)</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button onClick={() => {}} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load Data
                </Button>
                <Button variant="outline" onClick={() => {}} disabled={!data || isLoading}>
                    Export Excel
                </Button>
            </div>
            
            {/* Table will go here */}
        </div>
    );
}
```

- [ ] **Step 2: Add Data Fetching and Export Logic**

Modify `MonitoringGantungPage` to handle loading and exporting.

```tsx
    const handleLoadData = async () => {
        if (!startDate || !endDate) return toast.error("Pilih rentang tanggal terlebih dahulu");
        setIsLoading(true);
        try {
            const res = await getMonitoringGantungData(startDate, endDate);
            setData(res);
            toast.success("Data berhasil dimuat");
        } catch (error) {
            toast.error("Gagal memuat data");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (!data) return;
        
        const wb = xlsx.utils.book_new();
        const formatRupiah = (num: number) => "Rp" + num.toLocaleString('id-ID');
        
        const generateSheet = (sheetName: string, dataArray: HangingDataRow[], title: string) => {
            const rows = [];
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
```
Update the `onClick` props on the buttons in the JSX to use these new functions: `<Button onClick={handleLoadData} ...>` and `<Button onClick={handleExport} ...>`.

- [ ] **Step 3: Add the UI Table Components**

Add this below the Action Bar div inside the JSX return:

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/page.tsx
git commit -m "feat: add ui and export functionality for monitoring gantung"
```
