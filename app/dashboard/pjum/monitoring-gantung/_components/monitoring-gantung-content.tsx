"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMonitoringGantungData, MonitoringGantungResult, HangingDataRow } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import { Loader2, Download, Search } from "lucide-react";
import { InfoPopover } from "@/components/ui/info-popover";

const PERIOD_OPTIONS = [
    { value: "30", label: "30 Hari Terakhir" },
    { value: "60", label: "60 Hari Terakhir" },
    { value: "90", label: "90 Hari Terakhir" },
];

export function MonitoringGantungContent({ branches = [] }: { branches?: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const urlBranch = searchParams.get("branchName") || "all";
    const urlPeriod = searchParams.get("period") || "30";

    const [branchName, setBranchName] = useState(urlBranch);
    const [period, setPeriod] = useState(urlPeriod);
    const [searchQuery, setSearchQuery] = useState("");

    const [isLoading, setIsLoading] = useState(true); // Start true since it loads on mount
    const [isExporting, setIsExporting] = useState(false);
    const [data, setData] = useState<MonitoringGantungResult | null>(null);

    const updateUrl = useCallback((branch: string, prd: string) => {
        const params = new URLSearchParams(searchParams.toString());
        branch !== "all" ? params.set("branchName", branch) : params.delete("branchName");
        prd !== "30" ? params.set("period", prd) : params.delete("period");
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleLoadData = useCallback(async (currentBranch: string, currentPeriod: string) => {
        setIsLoading(true);
        try {
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - parseInt(currentPeriod, 10));

            const to = dEnd.toISOString().split('T')[0];
            const from = dStart.toISOString().split('T')[0];

            const branchParam = currentBranch === "all" ? undefined : currentBranch;
            const res = await getMonitoringGantungData(from, to, branchParam);
            setData(res);
        } catch (error) {
            toast.error("Gagal memuat data");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setBranchName(urlBranch);
        setPeriod(urlPeriod);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleLoadData(urlBranch, urlPeriod);
        }, 300);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [urlBranch, urlPeriod, handleLoadData]);

    const handleFilterChange = (type: "branch" | "period", value: string) => {
        let newBranch = branchName;
        let newPeriod = period;
        if (type === "branch") newBranch = value;
        if (type === "period") newPeriod = value;
        
        setBranchName(newBranch);
        setPeriod(newPeriod);
        updateUrl(newBranch, newPeriod);
    };

    const q = searchQuery.toLowerCase();
    const filterData = (arr: HangingDataRow[]) => {
        if (!q) return arr;
        return arr.filter(row => 
            row.name.toLowerCase().includes(q) || 
            row.nik.toLowerCase().includes(q)
        );
    };

    const bmcBelum = data ? filterData(data.bmcBelum) : [];
    const bnmBelum = data ? filterData(data.bnmBelum) : [];
    const gantungReal = data ? filterData(data.gantungReal) : [];

    const uniqueBms = new Set([
        ...bmcBelum.map(b => b.nik),
        ...bnmBelum.map(b => b.nik),
        ...gantungReal.map(b => b.nik)
    ]);
    const activeBmsCount = uniqueBms.size;

    const handleExport = async () => {
        if (!data) return;
        setIsExporting(true);
        
        try {
            const dEnd = new Date();
            const dStart = new Date();
            dStart.setDate(dStart.getDate() - parseInt(period, 10));

            const to = dEnd.toISOString().split('T')[0];
            const from = dStart.toISOString().split('T')[0];
            const branchParam = branchName === "all" ? undefined : branchName;

            // Ambil seluruh data BMS termasuk yang tidak punya laporan khusus untuk export
            const exportData = await getMonitoringGantungData(from, to, branchParam, true);
            
            const expBmcBelum = filterData(exportData.bmcBelum);
            const expBnmBelum = filterData(exportData.bnmBelum);
            const expGantungReal = filterData(exportData.gantungReal);

            const wb = xlsx.utils.book_new();
            const formatRupiah = (num: number) => "Rp" + num.toLocaleString('id-ID');
        
            const generateSheet = (sheetName: string, dataArray: HangingDataRow[], title: string) => {
                const rows: any[][] = [];
                rows.push([title, null, null, null, null, null, null, null, null]);
                rows.push([
                    `Data difilter (Cabang: ${branchName}, Periode: ${period} hari terakhir). Menampilkan seluruh BMS.`,
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

            generateSheet("1 BMC Belum", expBmcBelum, "BMS oke, BMC belum, BNM belum");
            generateSheet("2 BNM Belum", expBnmBelum, "BMS oke, BMC oke, BNM belum");
            generateSheet("3 Gantung Real", expGantungReal, "BMS oke, BMC oke, BNM oke, gantung real belum PJUM");

        xlsx.writeFile(wb, `Laporan-Gantung-${period}Hari.xlsx`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">
                Total <span className="text-foreground font-medium">{data ? activeBmsCount : 0}</span> BMS dengan laporan gantung
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

                <Select value={period} onValueChange={(val) => handleFilterChange("period", val)}>
                    <SelectTrigger className="flex-[0.8] min-w-[150px] bg-white h-9 text-xs">
                        <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                        {PERIOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={branchName} onValueChange={(val) => handleFilterChange("branch", val)}>
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
                    <Button onClick={handleExport} disabled={!data || isExporting || isLoading} className="gap-2 h-9 text-xs">
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Ekspor XLSX
                    </Button>
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
                        { value: 'bmcBelum', title: 'BMC Belum', items: bmcBelum },
                        { value: 'bnmBelum', title: 'BNM Belum', items: bnmBelum },
                        { value: 'gantungReal', title: 'Gantung Real', items: gantungReal }
                    ] as const).map(tab => (
                        <TabsContent key={tab.value} value={tab.value} className="bg-card rounded-lg border">
                            <div className="overflow-auto max-h-[600px]">
                                <Table className="text-xs">
                                    <TableHeader className="sticky top-0 bg-blue-100/50 z-10">
                                        <TableRow>
                                            <TableHead className="min-w-[80px]">NIK</TableHead>
                                            <TableHead className="min-w-[150px]">Nama BMS</TableHead>
                                            <TableHead>Cabang</TableHead>
                                            <TableHead>0-7 Hari</TableHead>
                                            <TableHead>8-14 Hari</TableHead>
                                            <TableHead>15-21 Hari</TableHead>
                                            <TableHead>22-28 Hari</TableHead>
                                            <TableHead>&gt;28 Hari</TableHead>
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
                                                    {(['0-7 Hari', '8-14 Hari', '15-21 Hari', '22-28 Hari', '>28 Hari'] as const).map(bucketKey => (
                                                        <TableCell key={bucketKey} className="align-top min-w-[180px]">
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
