"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    applyRealisasiRevision,
    saveRealisasiRevision,
    type RevisedItemData,
    type UploadedBapPdf,
} from "./actions";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    FolderOpen,
    Loader2,
    Search,
    Save,
    Upload,
    X,
} from "lucide-react";
import { RevisiItemCard } from "./components/revisi-item-card";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";

export type SearchedReport = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    totalReal: number;
    createdAt: string;
    updatedAt: string;
    bmsName: string;
    bmsNIK: string;
    completedPdfPath: string | null;
    reportFinalDriveUrl: string | null;
    revisedPdfDriveUrl: string | null;
    revisedPdfFolderUrl: string | null;
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
};

type Props = {
    initialQuery: string;
    report: SearchedReport | null;
};

function fmtCurrency(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n);
}

const MAX_BAP_PDF_BYTES = 12 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
                reject(new Error("Gagal membaca file BAP."));
                return;
            }

            resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Gagal membaca file BAP."));
        reader.readAsDataURL(file);
    });
}

function isBmsRealisasiItem(item: ReportItemJson) {
    return (
        item.handler === "BMS" &&
        (item.condition === "RUSAK" ||
            item.preventiveCondition === "NOT_OK" ||
            (item.realisasiItems && item.realisasiItems.length > 0))
    );
}

export function RevisiLaporanClient({ initialQuery, report }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [isPending, startTransition] = useTransition();

    // Editor state
    const [alasanIntervensi, setAlasanIntervensi] = useState("");
    const [bapFile, setBapFile] = useState<File | null>(null);
    const [bapFileError, setBapFileError] = useState<string | null>(null);
    const [itemStates, setItemStates] = useState<
        Record<string, RevisedItemData>
    >({});
    const initializedReportNumberRef = useRef<string | null>(null);
    const bapInputRef = useRef<HTMLInputElement | null>(null);

    const [result, setResult] = useState<{
        type: "success" | "error";
        message: string;
        folderUrl?: string;
        revisedPdfUrl?: string;
    } | null>(null);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        const reportNumber = report?.reportNumber ?? null;

        if (initializedReportNumberRef.current === reportNumber) {
            return;
        }

        initializedReportNumberRef.current = reportNumber;

        if (!report) {
            setItemStates({});
            setAlasanIntervensi("");
            setBapFile(null);
            setBapFileError(null);
            setResult(null);
            return;
        }

        const initialStates: Record<string, RevisedItemData> = {};

        const damagedItems = report.items.filter(isBmsRealisasiItem);

        for (const item of damagedItems) {
            let realisasi = item.realisasiItems ?? [];

            if (realisasi.length === 0) {
                const ests = report.estimations.filter(
                    (e) => e.itemId === item.itemId,
                );
                realisasi = ests.map((e) => ({
                    materialName: e.materialName,
                    quantity: e.quantity,
                    unit: e.unit,
                    price: e.price,
                    totalPrice: e.totalPrice,
                }));
            }

            initialStates[item.itemId] = {
                itemId: item.itemId,
                realisasiItems: realisasi,
                completionNotes:
                    (item as unknown as { completionNotes?: string })
                        .completionNotes ?? "",
            };
        }

        setItemStates(initialStates);
        setAlasanIntervensi("");
        setBapFile(null);
        setBapFileError(null);
        setResult(null);
    }, [report]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        router.push(`?q=${encodeURIComponent(query.trim())}`);
    };

    const handleBapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;

        setBapFileError(null);

        if (!file) {
            setBapFile(null);
            return;
        }

        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            setBapFile(null);
            setBapFileError("File BAP harus berupa PDF.");
            e.currentTarget.value = "";
            return;
        }

        if (file.size > MAX_BAP_PDF_BYTES) {
            setBapFile(null);
            setBapFileError("Ukuran file BAP maksimal 12 MB.");
            e.currentTarget.value = "";
            return;
        }

        setBapFile(file);
    };

    const buildBapUpload = async (): Promise<UploadedBapPdf | undefined> => {
        if (!bapFile) return undefined;

        return {
            fileName: bapFile.name,
            mimeType: bapFile.type || "application/pdf",
            base64: await fileToBase64(bapFile),
        };
    };

    const handleSaveAndGenerate = () => {
        if (!report) return;
        if (!alasanIntervensi.trim()) {
            setResult({
                type: "error",
                message: "Alasan Intervensi wajib diisi.",
            });
            return;
        }

        setResult(null);

        startTransition(async () => {
            let bapUpload: UploadedBapPdf | undefined;
            try {
                bapUpload = await buildBapUpload();
            } catch (error) {
                setResult({
                    type: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Gagal membaca file BAP.",
                });
                return;
            }

            // 1. Save DB
            const saveRes = await saveRealisasiRevision({
                reportNumber: report.reportNumber,
                alasanIntervensi: alasanIntervensi.trim(),
                items: Object.values(itemStates),
            });

            if (!saveRes.success) {
                setResult({
                    type: "error",
                    message: saveRes.error,
                });
                return;
            }

            // 2. Generate PDF
            const genRes = await applyRealisasiRevision(
                report.reportNumber,
                alasanIntervensi.trim(),
                bapUpload,
            );

            if (genRes.success) {
                setResult({
                    type: "success",
                    message: `${saveRes.message} PDF Revisi berhasil dibuat${bapUpload ? " dengan BAP di halaman awal" : ""} dan di-upload ke Google Drive.`,
                    folderUrl: genRes.folderUrl,
                    revisedPdfUrl: genRes.revisedPdfUrl,
                });
            } else {
                setResult({
                    type: "error",
                    message: `Data tersimpan, tapi gagal generate PDF: ${genRes.error}`,
                });
            }
        });
    };

    const isCompleted = report?.status === "COMPLETED";
    const hasExistingRevision = !!(
        result?.revisedPdfUrl ?? report?.revisedPdfDriveUrl
    );

    const damagedItems = useMemo(
        () => report?.items.filter(isBmsRealisasiItem) ?? [],
        [report],
    );

    return (
        <div className="space-y-4">
            <Card className="overflow-hidden shadow-sm">
                <div className="border-b  px-4 py-3 lg:px-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-base">
                                Intervensi Revisi Laporan
                            </CardTitle>
                            <CardDescription>
                                Ubah realisasi laporan selesai dan buat PDF
                                revisi.
                            </CardDescription>
                        </div>
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full gap-2 lg:w-[420px]"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="report-search-input"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Contoh: MNT-2025-001"
                                    className="pl-9"
                                    autoComplete="off"
                                />
                            </div>
                            <Button
                                id="report-search-btn"
                                type="submit"
                                variant="default"
                                disabled={isPending}
                            >
                                Cari
                            </Button>
                        </form>
                    </div>
                </div>

                {report && (
                    <CardContent className="grid gap-x-5 gap-y-2 px-4 pb-3 pt-0 text-xs md:grid-cols-3 xl:grid-cols-[minmax(120px,0.9fr)_minmax(220px,1.5fr)_minmax(120px,0.8fr)_minmax(180px,1.1fr)_minmax(120px,0.8fr)_auto] xl:items-end lg:px-5">
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">
                                No. Laporan
                            </p>
                            <p className="truncate font-mono font-medium">
                                {report.reportNumber}
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">
                                Toko
                            </p>
                            <p className="truncate font-medium">
                                {report.storeCode
                                    ? `${report.storeCode} - ${report.storeName}`
                                    : report.storeName}
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">
                                Cabang
                            </p>
                            <p className="truncate font-medium">
                                {report.branchName}
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">
                                BMS
                            </p>
                            <p className="truncate font-medium">
                                {report.bmsName} ({report.bmsNIK})
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] uppercase text-muted-foreground">
                                Total DB
                            </p>
                            <p className="truncate font-mono font-medium">
                                {fmtCurrency(report.totalReal)}
                            </p>
                        </div>

                        <div className="justify-self-start xl:justify-self-end">
                            <StatusBadge status={report.status} />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Report not found */}
            {initialQuery && !report && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-800">
                        <p className="font-semibold">Laporan tidak ditemukan</p>
                        <p>
                            Nomor laporan <strong>{initialQuery}</strong> tidak
                            ada di sistem.
                        </p>
                    </div>
                </div>
            )}

            {/* Report found */}
            {report && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
                    {/* Left Column: Editable Items */}
                    <div className="min-w-0 space-y-4">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Data Realisasi Laporan
                                </CardTitle>
                                <CardDescription>
                                    {damagedItems.length} item membutuhkan
                                    pengecekan realisasi dan catatan
                                    penyelesaian.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {damagedItems.map((item) => {
                                    const state = itemStates[item.itemId];
                                    if (!state) return null;

                                    return (
                                        <RevisiItemCard
                                            key={item.itemId}
                                            item={item}
                                            state={state}
                                            onChange={(patch) => {
                                                setItemStates((prev) => ({
                                                    ...prev,
                                                    [item.itemId]: {
                                                        ...prev[item.itemId],
                                                        ...patch,
                                                    },
                                                }));
                                            }}
                                        />
                                    );
                                })}

                                {damagedItems.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic text-center py-4">
                                        Tidak ada item yang rusak/membutuhkan
                                        realisasi.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-4 xl:sticky xl:top-15">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Ringkasan Intervensi
                                </CardTitle>
                                <CardDescription>
                                    PDF PJUM akan dibuat ulang bila laporan ini
                                    sudah masuk PJUM approved.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Existing PDF links */}
                                {(report.reportFinalDriveUrl ||
                                    report.completedPdfPath) && (
                                    <div className="flex gap-2 flex-wrap">
                                        <a
                                            href={
                                                report.reportFinalDriveUrl ??
                                                report.completedPdfPath ??
                                                "#"
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-xs"
                                                id="btn-view-original-pdf"
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                Lihat PDF Asli
                                            </Button>
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Simpan Revisi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Alasan Intervensi */}
                                <div className="space-y-2">
                                    <Label htmlFor="alasan-intervensi">
                                        Alasan Intervensi{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Textarea
                                        id="alasan-intervensi"
                                        placeholder="Tuliskan alasan perubahan data..."
                                        value={alasanIntervensi}
                                        onChange={(e) =>
                                            setAlasanIntervensi(e.target.value)
                                        }
                                        className="resize-y min-h-[80px] text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bap-pdf-upload">
                                        Upload BAP{" "}
                                        <span className="text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="bap-pdf-upload"
                                            ref={bapInputRef}
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            onChange={handleBapFileChange}
                                            className="pl-9 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                                            disabled={isPending}
                                        />
                                    </div>
                                    {bapFile && (
                                        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs">
                                            <span className="truncate">
                                                {bapFile.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                aria-label="Hapus file BAP"
                                                onClick={() => {
                                                    setBapFile(null);
                                                    setBapFileError(null);
                                                    if (bapInputRef.current) {
                                                        bapInputRef.current.value =
                                                            "";
                                                    }
                                                }}
                                                disabled={isPending}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                    {bapFileError && (
                                        <p className="text-xs text-destructive">
                                            {bapFileError}
                                        </p>
                                    )}
                                </div>

                                {/* Not COMPLETED warning */}
                                {!isCompleted && (
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>
                                            Status laporan ini:{" "}
                                            <strong>{report.status}</strong>.
                                            Revisi hanya untuk COMPLETED.
                                        </p>
                                    </div>
                                )}

                                {/* Action result feedback */}
                                {result && (
                                    <div
                                        className={`rounded-lg border p-3 text-sm space-y-2 ${
                                            result.type === "success"
                                                ? "border-green-200 bg-green-50 text-green-800"
                                                : "border-red-200 bg-red-50 text-red-800"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {result.type === "success" ? (
                                                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                                            )}
                                            <p>{result.message}</p>
                                        </div>

                                        {result.type === "success" && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                {result.revisedPdfUrl && (
                                                    <a
                                                        href={
                                                            result.revisedPdfUrl
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-full text-xs gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                                                        >
                                                            <FileText className="h-3 w-3" />{" "}
                                                            Buka PDF Revisi
                                                        </Button>
                                                    </a>
                                                )}
                                                {result.folderUrl && (
                                                    <a
                                                        href={result.folderUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-full text-xs gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                                                        >
                                                            <FolderOpen className="h-3 w-3" />{" "}
                                                            Buka Folder Drive
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Apply button */}
                                <Button
                                    id="btn-apply-revision"
                                    onClick={handleSaveAndGenerate}
                                    disabled={
                                        !isCompleted ||
                                        isPending ||
                                        !alasanIntervensi.trim()
                                    }
                                    className="w-full gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Simpan & Generate PDF
                                        </>
                                    )}
                                </Button>

                                {hasExistingRevision && !result && (
                                    <p className="text-[11px] text-center text-muted-foreground mt-2">
                                        Sudah ada revisi sebelumnya. Menyimpan
                                        akan membuat versi revisi baru.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
