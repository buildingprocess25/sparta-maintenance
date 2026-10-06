# Monitoring Laporan Gantung - Filter & Query Optimization Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the monitoring gantung page with a dual-layer caching strategy: `unstable_cache` on the server (DB hit once per 30 min, shared across users) and "Fetch Once, Filter Locally" on the client (filter switching is instant with zero network calls). Replace rolling-days period with a per-month filter (default YTD). Move the Excel export into a confirmation dialog.

**Architecture:**
1. Server Action (`actions.ts`) is rewritten: the Prisma query is optimized with an `OR` condition, `branchName` parameter is removed (all branch filtering moves to client), `createdAt` is added to each bucket report item, and the core logic is wrapped with `unstable_cache` (30-min TTL). The hacky `global.monitoringGantungCache` is deleted.
2. Client Component (`monitoring-gantung-content.tsx`) fetches YTD + all branches **once on mount**, stores the superset in React state, and derives all filtered views via `useMemo`. Filter changes (month, branch, search) never trigger a server call.
3. A new `export-monitoring-dialog.tsx` component handles the export popup with its own independent month/branch filters and calls the server action with `includeEmpty=true`.

**Tech Stack:** Next.js App Router, Prisma, React, xlsx, shadcn/ui, `unstable_cache`.

## Global Constraints

- Must retain the `HEAD OFFICE` exclusions and `totalReal === 0` exclusions.
- Month filter labels: just the month name ("Jan", "Feb", etc.) and "YTD".
- YTD is the default filter for both the dashboard and the export dialog.
- `unstable_cache` revalidate: 1800 seconds (30 minutes), tag: `"monitoring-gantung"`.

---

### Task 1: Rewrite Server Action with `unstable_cache` and Query Optimization

**Files:**
- Modify: `app/dashboard/pjum/monitoring-gantung/actions.ts`

**Interfaces:**
- Produces: `getMonitoringGantungData(includeEmpty?: boolean): Promise<MonitoringGantungResult>` — always fetches YTD + all branches.
- Produces: `BucketReport` type (now includes `createdAt: string`).
- Produces: `BUCKET_KEYS` constant array for shared usage.

- [ ] **Step 1: Rewrite the entire `actions.ts` file**

Replace the full contents of `app/dashboard/pjum/monitoring-gantung/actions.ts` with:

```typescript
"use server";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BucketReport = {
    reportNumber: string;
    total: number;
    createdAt: string; // ISO string — enables client-side month filtering
};

export const BUCKET_KEYS = ['0-7 Hari', '8-14 Hari', '15-21 Hari', '22-28 Hari', '>28 Hari'] as const;
export type BucketKey = typeof BUCKET_KEYS[number];

export type HangingDataRow = {
    nik: string;
    name: string;
    branch: string;
    latestPjumDate: string | null;
    buckets: Record<BucketKey, BucketReport[]>;
};

export type MonitoringGantungResult = {
    bmcBelum: HangingDataRow[];
    bnmBelum: HangingDataRow[];
    gantungReal: HangingDataRow[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getYtdStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
}

function getBucket(date: Date): BucketKey {
    const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return '0-7 Hari';
    if (diff <= 14) return '8-14 Hari';
    if (diff <= 21) return '15-21 Hari';
    if (diff <= 28) return '22-28 Hari';
    return '>28 Hari';
}

function createEmptyBuckets(): Record<BucketKey, BucketReport[]> {
    return {
        '0-7 Hari': [],
        '8-14 Hari': [],
        '15-21 Hari': [],
        '22-28 Hari': [],
        '>28 Hari': [],
    };
}

// ─── Cached Core Query ─────────────────────────────────────────────────────

const fetchMonitoringGantungData = unstable_cache(
    async (includeEmpty: boolean): Promise<MonitoringGantungResult> => {
        const startDate = getYtdStart();
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // 1. Fetch all BMS users (excluding HEAD OFFICE)
        const bmsUsers = await prisma.user.findMany({
            where: { role: 'BMS' },
            select: { NIK: true, name: true, branchNames: true },
        });

        // 2. Batch fetch latest PJUM per BMS (avoids N+1)
        const allPjums = await prisma.pjumExport.groupBy({
            by: ['bmsNIK'],
            _max: { createdAt: true },
        });
        const latestPjumMap = new Map<string, Date>();
        for (const p of allPjums) {
            if (p._max.createdAt) latestPjumMap.set(p.bmsNIK, p._max.createdAt);
        }

        // 3. Build BMS lookup and initialize per-sheet Maps
        const bmsMap = new Map<string, { NIK: string; name: string; branchNames: string[]; latestPjum: { createdAt: Date } | null }>();
        const sheets = {
            bmcBelum: new Map<string, HangingDataRow>(),
            bnmBelum: new Map<string, HangingDataRow>(),
            gantungReal: new Map<string, HangingDataRow>(),
        };

        for (const bms of bmsUsers) {
            const branch = bms.branchNames?.[0] ?? "-";
            if (branch === "HEAD OFFICE" || bms.branchNames.includes("HEAD OFFICE")) continue;

            const latestPjumCreatedAt = latestPjumMap.get(bms.NIK);
            bmsMap.set(bms.NIK, {
                ...bms,
                latestPjum: latestPjumCreatedAt ? { createdAt: latestPjumCreatedAt } : null,
            });

            const baseRow: HangingDataRow = {
                nik: bms.NIK,
                name: bms.name,
                branch,
                latestPjumDate: latestPjumCreatedAt ? latestPjumCreatedAt.toISOString() : null,
                buckets: createEmptyBuckets(),
            };

            sheets.bmcBelum.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
            sheets.bnmBelum.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
            sheets.gantungReal.set(bms.NIK, { ...baseRow, buckets: createEmptyBuckets() });
        }

        // 4. Optimized query: only fetch reports that are actually "hanging"
        const reports = await prisma.report.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                OR: [
                    { status: 'PENDING_REVIEW' },
                    { status: 'APPROVED_BMC' },
                    { status: 'COMPLETED', pjumExportedAt: null },
                ],
            },
            include: {
                createdBy: { select: { NIK: true, name: true, branchNames: true } },
            },
        });

        // 5. Categorize each report into the correct sheet + bucket
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
                const row = targetSheet.get(bmsInfo.NIK);
                if (row) {
                    const bucket = getBucket(baseDate);
                    row.buckets[bucket].push({
                        reportNumber: report.reportNumber,
                        total,
                        createdAt: report.createdAt.toISOString(),
                    });
                }
            }
        }

        // 6. Finalize: optionally filter out BMS with zero reports
        const hasReports = (row: HangingDataRow) =>
            Object.values(row.buckets).some((b) => b.length > 0);

        return {
            bmcBelum: includeEmpty
                ? Array.from(sheets.bmcBelum.values())
                : Array.from(sheets.bmcBelum.values()).filter(hasReports),
            bnmBelum: includeEmpty
                ? Array.from(sheets.bnmBelum.values())
                : Array.from(sheets.bnmBelum.values()).filter(hasReports),
            gantungReal: includeEmpty
                ? Array.from(sheets.gantungReal.values())
                : Array.from(sheets.gantungReal.values()).filter(hasReports),
        };
    },
    ["monitoring-gantung-data"],
    { revalidate: 1800, tags: ["monitoring-gantung"] }
);

// ─── Server Action (public API) ────────────────────────────────────────────

export async function getMonitoringGantungData(
    includeEmpty: boolean = false,
): Promise<MonitoringGantungResult> {
    return fetchMonitoringGantungData(includeEmpty);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/actions.ts
git commit -m "perf(pjum): rewrite monitoring gantung action with unstable_cache and optimized query"
```

---

### Task 2: Create Export Monitoring Dialog

**Files:**
- Create: `app/dashboard/pjum/monitoring-gantung/_components/export-monitoring-dialog.tsx`

**Interfaces:**
- Consumes: `getMonitoringGantungData`, `HangingDataRow`, `BucketReport`, `BUCKET_KEYS` from `../actions.ts`.
- Produces: `<ExportMonitoringDialog branches={string[]} />` component.
- Produces: `MONTH_OPTIONS` constant and `filterByMonthAndBranch` helper (exported for reuse in Task 3).

- [ ] **Step 1: Create the dialog component file**

Create `app/dashboard/pjum/monitoring-gantung/_components/export-monitoring-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import * as xlsx from "xlsx";
import {
    getMonitoringGantungData,
    HangingDataRow,
    BucketReport,
    BUCKET_KEYS,
    type MonitoringGantungResult,
} from "../actions";

// ─── Shared Constants & Helpers ────────────────────────────────────────────

export const MONTH_OPTIONS = [
    { value: "0", label: "Jan" },
    { value: "1", label: "Feb" },
    { value: "2", label: "Mar" },
    { value: "3", label: "Apr" },
    { value: "4", label: "Mei" },
    { value: "5", label: "Jun" },
    { value: "6", label: "Jul" },
    { value: "7", label: "Agu" },
    { value: "8", label: "Sep" },
    { value: "9", label: "Okt" },
    { value: "10", label: "Nov" },
    { value: "11", label: "Des" },
];

/**
 * Filters MonitoringGantungResult by month and branch, entirely client-side.
 * - month "ytd" = no month filter
 * - branch "all" or empty array = no branch filter
 * Returns a new result with only matching reports inside each bucket.
 */
export function filterByMonthAndBranch(
    data: MonitoringGantungResult,
    month: string,
    branches: string[],
): MonitoringGantungResult {
    const monthNum = month === "ytd" ? null : parseInt(month, 10);

    const filterSheet = (rows: HangingDataRow[]): HangingDataRow[] => {
        let filtered = rows;

        // Branch filter (row-level)
        if (branches.length > 0) {
            filtered = filtered.filter((row) => branches.includes(row.branch));
        }

        // Month filter (report-level, inside each bucket)
        if (monthNum !== null) {
            filtered = filtered.map((row) => ({
                ...row,
                buckets: Object.fromEntries(
                    BUCKET_KEYS.map((key) => [
                        key,
                        row.buckets[key].filter(
                            (r) => new Date(r.createdAt).getMonth() === monthNum,
                        ),
                    ]),
                ) as HangingDataRow["buckets"],
            }));
        }

        return filtered;
    };

    return {
        bmcBelum: filterSheet(data.bmcBelum),
        bnmBelum: filterSheet(data.bnmBelum),
        gantungReal: filterSheet(data.gantungReal),
    };
}

// ─── Export Dialog Component ───────────────────────────────────────────────

export function ExportMonitoringDialog({ branches }: { branches: string[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("ytd");

    const getMonthLabel = (value: string) =>
        value === "ytd"
            ? "YTD"
            : MONTH_OPTIONS.find((m) => m.value === value)?.label ?? value;

    const handleExport = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Menyiapkan file ekspor...");

        try {
            // Fetch YTD + all branches with includeEmpty=true (cached by unstable_cache)
            const rawData = await getMonitoringGantungData(true);

            // Client-side filtering
            const data = filterByMonthAndBranch(rawData, selectedMonth, selectedBranches);

            const wb = xlsx.utils.book_new();
            const formatRupiah = (num: number) => "Rp" + num.toLocaleString("id-ID");

            const branchLabel =
                selectedBranches.length === 0
                    ? "Semua Cabang"
                    : selectedBranches.join(", ");

            const generateSheet = (
                sheetName: string,
                dataArray: HangingDataRow[],
                title: string,
            ) => {
                const rows: (string | number | null)[][] = [];
                rows.push([title, null, null, null, null, null, null, null, null]);
                rows.push([
                    `Data difilter (Cabang: ${branchLabel}, Periode: ${getMonthLabel(selectedMonth)}). Menampilkan seluruh BMS.`,
                    null, null, null, null, null, null, null, null,
                ]);
                rows.push([null, null, null, null, null, null, null, null, null]);
                rows.push([
                    "NIK BMS", "Nama BMS", "Cabang", "PJUM terakhir dibuat",
                    "Periode Gantung 0-7 Hari", "Periode Gantung 8-14 Hari",
                    "Periode Gantung 15-21 Hari", "Periode Gantung 22-28 Hari",
                    "Periode Gantung >28 Hari",
                ]);

                for (const info of dataArray) {
                    const formatBucket = (reps: BucketReport[]) => {
                        if (reps.length === 0) return "-";
                        const sum = reps.reduce((acc, r) => acc + r.total, 0);
                        let str = `${reps.length} laporan | Total ${formatRupiah(sum)}\r\n`;
                        str += reps
                            .map((r) => `${r.reportNumber} — ${formatRupiah(r.total)}`)
                            .join("\r\n");
                        return str;
                    };

                    rows.push([
                        info.nik, info.name, info.branch,
                        info.latestPjumDate
                            ? new Date(info.latestPjumDate).toLocaleString("id-ID")
                            : "-",
                        formatBucket(info.buckets["0-7 Hari"]),
                        formatBucket(info.buckets["8-14 Hari"]),
                        formatBucket(info.buckets["15-21 Hari"]),
                        formatBucket(info.buckets["22-28 Hari"]),
                        formatBucket(info.buckets[">28 Hari"]),
                    ]);
                }

                const ws = xlsx.utils.aoa_to_sheet(rows);
                ws["!cols"] = [
                    { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 25 },
                    { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
                ];
                const range = xlsx.utils.decode_range(ws["!ref"] || "A1:I1");
                for (let R = 4; R <= range.e.r; ++R) {
                    for (let C = 4; C <= 8; ++C) {
                        const ref = xlsx.utils.encode_cell({ c: C, r: R });
                        if (ws[ref]) ws[ref].s = { alignment: { wrapText: true, vertical: "top" } };
                    }
                }
                xlsx.utils.book_append_sheet(wb, ws, sheetName);
            };

            generateSheet("1 BMC Belum", data.bmcBelum, "BMS oke, BMC belum, BNM belum");
            generateSheet("2 BNM Belum", data.bnmBelum, "BMS oke, BMC oke, BNM belum");
            generateSheet(
                "3 Gantung Real",
                data.gantungReal,
                "BMS oke, BMC oke, BNM oke, gantung real belum PJUM",
            );

            xlsx.writeFile(
                wb,
                `Laporan-Gantung-${getMonthLabel(selectedMonth)}.xlsx`,
            );
            toast.success("File berhasil diunduh", { id: toastId });
            setOpen(false);
        } catch (error: unknown) {
            toast.error(
                error instanceof Error ? error.message : "Gagal mengekspor data",
                { id: toastId },
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 h-9 text-xs">
                    <Download className="h-4 w-4" />
                    Ekspor XLSX
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Laporan Gantung</DialogTitle>
                    <DialogDescription>
                        Pilih kriteria data laporan yang ingin Anda ekspor ke
                        Excel. Filter ini tidak terikat dengan filter tabel.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label>Bulan</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ytd">YTD</SelectItem>
                                {MONTH_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Cabang</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal text-sm px-3 h-10"
                                >
                                    {selectedBranches.length === 0
                                        ? "Semua Cabang"
                                        : selectedBranches.length === 1
                                            ? selectedBranches[0]
                                            : `${selectedBranches.length} Cabang Dipilih`}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-75 overflow-y-auto">
                                <DropdownMenuCheckboxItem
                                    checked={selectedBranches.length === 0}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedBranches([]);
                                    }}
                                >
                                    Semua Cabang
                                </DropdownMenuCheckboxItem>
                                {branches.map((b) => (
                                    <DropdownMenuCheckboxItem
                                        key={b}
                                        checked={selectedBranches.includes(b)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedBranches([...selectedBranches, b]);
                                            } else {
                                                setSelectedBranches(
                                                    selectedBranches.filter((sb) => sb !== b),
                                                );
                                            }
                                        }}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {b}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleExport} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Unduh File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/_components/export-monitoring-dialog.tsx
git commit -m "feat(pjum): add export monitoring gantung dialog with independent filters"
```

---

### Task 3: Rewrite Dashboard Content with "Fetch Once, Filter Locally"

**Files:**
- Modify: `app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx`

**Interfaces:**
- Consumes: `getMonitoringGantungData`, `MonitoringGantungResult`, `HangingDataRow`, `BUCKET_KEYS` from `../actions.ts`.
- Consumes: `MONTH_OPTIONS`, `filterByMonthAndBranch`, `ExportMonitoringDialog` from `./export-monitoring-dialog.tsx`.

- [ ] **Step 1: Rewrite the entire content component**

Replace the full contents of `app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx` with:

```tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getMonitoringGantungData, MonitoringGantungResult, HangingDataRow, BUCKET_KEYS } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { InfoPopover } from "@/components/ui/info-popover";
import { MONTH_OPTIONS, filterByMonthAndBranch, ExportMonitoringDialog } from "./export-monitoring-dialog";

export function MonitoringGantungContent({ branches = [] }: { branches?: string[] }) {
    // ─── State ──────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [fullData, setFullData] = useState<MonitoringGantungResult | null>(null);

    // Filter state (client-side only, no server calls)
    const [month, setMonth] = useState("ytd");
    const [branchName, setBranchName] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // ─── Fetch Once on Mount (YTD + all branches) ───────────────────────
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getMonitoringGantungData(false);
            setFullData(res);
        } catch (error) {
            toast.error("Gagal memuat data");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ─── Derived Filtered Data (instant, no server call) ────────────────
    const filteredData = useMemo(() => {
        if (!fullData) return null;

        // Step 1: Filter by month and branch
        const branchArr = branchName === "all" ? [] : [branchName];
        const result = filterByMonthAndBranch(fullData, month, branchArr);

        // Step 2: Filter by search query (NIK or name)
        const q = searchQuery.toLowerCase();
        if (!q) return result;

        const filterBySearch = (rows: HangingDataRow[]) =>
            rows.filter(
                (row) =>
                    row.name.toLowerCase().includes(q) ||
                    row.nik.toLowerCase().includes(q),
            );

        return {
            bmcBelum: filterBySearch(result.bmcBelum),
            bnmBelum: filterBySearch(result.bnmBelum),
            gantungReal: filterBySearch(result.gantungReal),
        };
    }, [fullData, month, branchName, searchQuery]);

    // ─── Derived Counts ─────────────────────────────────────────────────
    const hasReports = (row: HangingDataRow) =>
        Object.values(row.buckets).some((b) => b.length > 0);

    const bmcBelum = filteredData?.bmcBelum.filter(hasReports) ?? [];
    const bnmBelum = filteredData?.bnmBelum.filter(hasReports) ?? [];
    const gantungReal = filteredData?.gantungReal.filter(hasReports) ?? [];

    const uniqueBms = new Set([
        ...bmcBelum.map((b) => b.nik),
        ...bnmBelum.map((b) => b.nik),
        ...gantungReal.map((b) => b.nik),
    ]);
    const activeBmsCount = uniqueBms.size;

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">
                Total{" "}
                <span className="text-foreground font-medium">
                    {fullData ? activeBmsCount : 0}
                </span>{" "}
                BMS dengan laporan gantung
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full border-b pb-4">
                <div className="relative flex-[2] min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Cari NIK atau nama BMS..."
                        className="pl-8 bg-white h-9 text-xs w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="flex-[0.8] min-w-[120px] bg-white h-9 text-xs">
                        <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ytd" className="text-xs">YTD</SelectItem>
                        {MONTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={branchName} onValueChange={setBranchName}>
                    <SelectTrigger className="flex-[0.8] min-w-[150px] bg-white h-9 text-xs">
                        <SelectValue placeholder="Semua Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Semua Cabang</SelectItem>
                        {branches.map((b) => (
                            <SelectItem key={b} value={b} className="text-xs">
                                {b}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                    <InfoPopover hint="Keterangan Data">
                        <div className="space-y-2">
                            <p className="font-semibold text-sm">Penjelasan Status Tab & Ekspor:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>BMC Belum:</strong> Laporan sudah di-submit BMS, tapi masih menunggu persetujuan BMC.</li>
                                <li><strong>BNM Belum:</strong> Laporan sudah disetujui BMC, tapi masih menunggu persetujuan BNM Manager.</li>
                                <li><strong>Gantung Real:</strong> Laporan berstatus Selesai yang belum masuk PJUM. Laporan ini terlewat (tidak di-select) oleh BMC, padahal sudah selesai sebelum pembuatan PJUM terakhir BMS tersebut.</li>
                            </ul>
                        </div>
                    </InfoPopover>
                    <ExportMonitoringDialog branches={branches} />
                </div>
            </div>

            <Tabs defaultValue="gantungReal" className="w-full flex flex-col">
                <div className="border-b mb-4">
                    <TabsList variant="line" className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                        <TabsTrigger
                            className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                            value="bmcBelum"
                        >
                            BMC Belum ({bmcBelum.length} BMS)
                        </TabsTrigger>
                        <TabsTrigger
                            className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                            value="bnmBelum"
                        >
                            BNM Belum ({bnmBelum.length} BMS)
                        </TabsTrigger>
                        <TabsTrigger
                            className="h-full rounded-none px-1 text-sm font-medium hover:text-primary data-[state=active]:text-primary data-[state=active]:shadow-none relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 transition-none"
                            value="gantungReal"
                        >
                            Gantung Real ({gantungReal.length} BMS)
                        </TabsTrigger>
                    </TabsList>
                </div>

                {([
                    { value: "bmcBelum", title: "BMC Belum", items: bmcBelum },
                    { value: "bnmBelum", title: "BNM Belum", items: bnmBelum },
                    { value: "gantungReal", title: "Gantung Real", items: gantungReal },
                ] as const).map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="bg-card rounded-lg border">
                        <div className="overflow-auto max-h-[600px]">
                            <Table className="text-xs">
                                <TableHeader className="sticky top-0 bg-blue-100/50 z-10">
                                    <TableRow>
                                        <TableHead className="min-w-[80px]">NIK</TableHead>
                                        <TableHead className="min-w-[150px]">Nama BMS</TableHead>
                                        <TableHead>Cabang</TableHead>
                                        {BUCKET_KEYS.map((key) => (
                                            <TableHead key={key}>{key}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-32">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                    <span>Memuat data...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : tab.items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                                                Tidak ada data BMS
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tab.items.map((row) => (
                                            <TableRow key={row.nik}>
                                                <TableCell className="font-medium">{row.nik}</TableCell>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.branch}</TableCell>
                                                {BUCKET_KEYS.map((bucketKey) => (
                                                    <TableCell key={bucketKey} className="align-top min-w-[180px]">
                                                        {row.buckets[bucketKey].length === 0 ? (
                                                            <span className="text-muted-foreground">-</span>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <div className="font-semibold text-xs border-b pb-1">
                                                                    {row.buckets[bucketKey].length} laporan | Rp
                                                                    {row.buckets[bucketKey]
                                                                        .reduce((sum, r) => sum + r.total, 0)
                                                                        .toLocaleString("id-ID")}
                                                                </div>
                                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                                    {row.buckets[bucketKey].map((r) => (
                                                                        <li key={r.reportNumber}>
                                                                            {r.reportNumber} - Rp
                                                                            {r.total.toLocaleString("id-ID")}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/pjum/monitoring-gantung/_components/monitoring-gantung-content.tsx
git commit -m "feat(pjum): fetch once filter locally with month/branch client-side filtering"
```
