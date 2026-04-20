"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Download,
    FileSpreadsheet,
    Filter,
    Loader2,
    SplitSquareHorizontal,
    Layers,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_STATUSES = [
    { value: "all", label: "Semua Status" },
    { value: "PENDING_ESTIMATION", label: "Pending Estimasi" },
    { value: "ESTIMATION_APPROVED", label: "Estimasi Disetujui" },
    { value: "ESTIMATION_REJECTED", label: "Estimasi Ditolak" },
    { value: "ESTIMATION_REJECTED_REVISION", label: "Revisi Estimasi" },
    { value: "IN_PROGRESS", label: "Sedang Dikerjakan" },
    { value: "PENDING_REVIEW", label: "Pending Review" },
    { value: "APPROVED_BMC", label: "Disetujui BMC" },
    { value: "REVIEW_REJECTED_REVISION", label: "Revisi Penyelesaian" },
    { value: "COMPLETED", label: "Selesai" },
];

type SheetKey = "reports" | "materials" | "pjum";

const SHEET_OPTIONS: { key: SheetKey; label: string; description: string }[] = [
    {
        key: "reports",
        label: "Rekap Laporan",
        description: "Data laporan, status, estimasi & realisasi biaya",
    },
    {
        key: "materials",
        label: "Rekap Material",
        description: "Detail item material per laporan",
    },
    {
        key: "pjum",
        label: "Rekap PJUM",
        description: "Data ekspor PJUM per minggu",
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    branchNames: string[];
};

// ─── Helper: trigger browser download from base64 ────────────────────────────

function downloadBase64(base64: string, filename: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportForm({ branchNames }: Props) {
    const [isPending, startTransition] = useTransition();

    // Filter state
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [branchName, setBranchName] = useState("all");
    const [status, setStatus] = useState("all");
    const [bmsNIK, setBmsNIK] = useState("");

    // Sheet selection
    const [selectedSheets, setSelectedSheets] = useState<SheetKey[]>([
        "reports",
        "materials",
        "pjum",
    ]);

    // Split or combined
    const [splitFiles, setSplitFiles] = useState(false);

    const toggleSheet = useCallback((key: SheetKey) => {
        setSelectedSheets((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
        );
    }, []);

    const handleExport = () => {
        if (selectedSheets.length === 0) {
            toast.error("Pilih minimal satu jenis data untuk diekspor");
            return;
        }

        const filter = {
            ...(fromDate && { fromDate }),
            ...(toDate && { toDate }),
            ...(branchName !== "all" && { branchName }),
            ...(status !== "all" && { status }),
            ...(bmsNIK.trim() && { bmsNIK: bmsNIK.trim() }),
        };

        const fileName = `sparta-export-${new Date().toISOString().slice(0, 10)}`;

        startTransition(async () => {
            try {
                const res = await fetch("/api/admin/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filter,
                        sheets: selectedSheets,
                        splitFiles,
                        fileName,
                    }),
                });

                if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error(
                        (json as { error?: string }).error ?? `HTTP ${res.status}`,
                    );
                }

                if (splitFiles) {
                    // Response: JSON with base64 files
                    const json = (await res.json()) as {
                        files: { name: string; data: string }[];
                    };

                    if (json.files.length === 0) {
                        toast.warning("Tidak ada data untuk diekspor", {
                            description:
                                "Coba ubah filter atau pastikan data sudah tersedia.",
                        });
                        return;
                    }

                    // Stagger downloads to avoid browser blocking
                    json.files.forEach(({ name, data }, i) => {
                        setTimeout(() => downloadBase64(data, name), i * 300);
                    });

                    toast.success(
                        `${json.files.length} file siap diunduh`,
                        { description: json.files.map((f) => f.name).join(", ") },
                    );
                } else {
                    // Response: binary xlsx
                    const blob = await res.blob();
                    if (blob.size < 100) {
                        toast.warning("Tidak ada data untuk diekspor");
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${fileName}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);

                    toast.success("File XLSX berhasil diunduh");
                }
            } catch (err) {
                toast.error("Gagal mengekspor data", {
                    description:
                        err instanceof Error
                            ? err.message
                            : "Terjadi kesalahan. Silakan coba lagi.",
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Filter Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        Filter Data
                    </CardTitle>
                    <CardDescription>
                        Kosongkan filter untuk mengekspor semua data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date range */}
                        <div className="space-y-2">
                            <Label htmlFor="export-from-date">Dari Tanggal</Label>
                            <Input
                                id="export-from-date"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="export-to-date">Sampai Tanggal</Label>
                            <Input
                                id="export-to-date"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>

                        {/* Branch */}
                        <div className="space-y-2">
                            <Label htmlFor="export-branch">Branch</Label>
                            <Select value={branchName} onValueChange={setBranchName}>
                                <SelectTrigger id="export-branch">
                                    <SelectValue placeholder="Semua Branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Branch</SelectItem>
                                    {branchNames.map((b) => (
                                        <SelectItem key={b} value={b}>
                                            {b}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="export-status">Status Laporan</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="export-status">
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {REPORT_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* NIK BMS */}
                        <div className="space-y-2">
                            <Label htmlFor="export-bms-nik">NIK BMS</Label>
                            <Input
                                id="export-bms-nik"
                                placeholder="Kosongkan untuk semua"
                                value={bmsNIK}
                                onChange={(e) => setBmsNIK(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sheet Selection Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        Pilih Data yang Diekspor
                    </CardTitle>
                    <CardDescription>
                        Centang data yang ingin disertakan dalam file XLSX.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {SHEET_OPTIONS.map((opt) => (
                            <div
                                key={opt.key}
                                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                            >
                                <Checkbox
                                    id={`sheet-${opt.key}`}
                                    checked={selectedSheets.includes(opt.key)}
                                    onCheckedChange={() => toggleSheet(opt.key)}
                                    className="mt-0.5"
                                />
                                <div className="grid gap-1">
                                    <Label
                                        htmlFor={`sheet-${opt.key}`}
                                        className="font-medium cursor-pointer"
                                    >
                                        {opt.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {opt.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Output Mode + Download */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Mode Output
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Toggle split/combined */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => setSplitFiles(false)}
                                className={`flex-1 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    !splitFiles
                                        ? "border-primary bg-primary/5"
                                        : "hover:bg-muted/40"
                                }`}
                            >
                                <Layers
                                    className={`h-5 w-5 shrink-0 ${!splitFiles ? "text-primary" : "text-muted-foreground"}`}
                                />
                                <div>
                                    <p className="text-sm font-medium">Gabungkan dalam 1 file</p>
                                    <p className="text-xs text-muted-foreground">
                                        Semua sheet dalam satu file .xlsx
                                    </p>
                                </div>
                                {!splitFiles && (
                                    <Badge variant="secondary" className="ml-auto text-[10px]">
                                        Aktif
                                    </Badge>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setSplitFiles(true)}
                                className={`flex-1 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    splitFiles
                                        ? "border-primary bg-primary/5"
                                        : "hover:bg-muted/40"
                                }`}
                            >
                                <SplitSquareHorizontal
                                    className={`h-5 w-5 shrink-0 ${splitFiles ? "text-primary" : "text-muted-foreground"}`}
                                />
                                <div>
                                    <p className="text-sm font-medium">Pisah per file</p>
                                    <p className="text-xs text-muted-foreground">
                                        Setiap sheet diunduh sebagai file terpisah
                                    </p>
                                </div>
                                {splitFiles && (
                                    <Badge variant="secondary" className="ml-auto text-[10px]">
                                        Aktif
                                    </Badge>
                                )}
                            </button>
                        </div>

                        <Separator />

                        <Button
                            onClick={handleExport}
                            disabled={isPending || selectedSheets.length === 0}
                            className="w-full sm:w-auto"
                            size="lg"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Unduh XLSX
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
