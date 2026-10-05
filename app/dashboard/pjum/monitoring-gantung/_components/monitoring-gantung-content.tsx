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
