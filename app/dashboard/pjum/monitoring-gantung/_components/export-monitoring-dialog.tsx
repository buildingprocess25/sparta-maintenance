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
        if (branches.length > 0 && !branches.includes("all")) {
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
