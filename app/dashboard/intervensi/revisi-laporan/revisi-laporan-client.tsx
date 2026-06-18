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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    FolderOpen,
    Loader2,
    Search,
    Save,
    ShieldAlert,
    Upload,
    X,
} from "lucide-react";
import { RevisiItemCard } from "./components/revisi-item-card";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";

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
    hideSearch?: boolean;
};

type RevisionResult = {
    type: "success" | "error";
    message: string;
    folderUrl?: string;
    revisedPdfUrl?: string;
};

function fmtCurrency(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n);
}

function formatSignedCurrency(value: number) {
    if (value === 0) return fmtCurrency(0);
    return `${value > 0 ? "+" : "-"}${fmtCurrency(Math.abs(value))}`;
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

function normalizeRealisasiItems(items: RevisedItemData["realisasiItems"]) {
    return items.map((item) => ({
        materialName: item.materialName.trim(),
        quantity: Number(item.quantity) || 0,
        unit: item.unit.trim(),
        price: Number(item.price) || 0,
        totalPrice:
            Number(item.totalPrice) ||
            (Number(item.quantity) || 0) * (Number(item.price) || 0),
    }));
}

function getRealisasiSubtotal(items: RevisedItemData["realisasiItems"]) {
    return normalizeRealisasiItems(items).reduce(
        (sum, item) => sum + item.totalPrice,
        0,
    );
}

function normalizeCompletionNotes(value: string | undefined | null) {
    return value?.trim() ?? "";
}

function buildRevisedItems(
    items: ReportItemJson[],
    itemStates: Record<string, RevisedItemData>,
) {
    return items.map((item) => {
        const state = itemStates[item.itemId];
        if (!state) return item;

        return {
            ...item,
            realisasiItems: normalizeRealisasiItems(state.realisasiItems),
            discountAmount: Math.max(0, state.discountAmount ?? 0),
            completionNotes:
                state.completionNotes !== undefined
                    ? state.completionNotes
                    : item.completionNotes,
        };
    });
}

export function RevisiLaporanClient({
    initialQuery,
    report,
    hideSearch = false,
}: Props) {
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

    const [result, setResult] = useState<RevisionResult | null>(null);

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
                discountAmount: Math.max(0, item.discountAmount ?? 0),
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

    const buildBapUpload = async (): Promise<UploadedBapPdf> => {
        if (!bapFile) {
            throw new Error("BAP wajib diunggah sebelum intervensi disimpan.");
        }

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
        if (!bapFile) {
            setResult({
                type: "error",
                message: "BAP wajib diunggah sebelum intervensi disimpan.",
            });
            return;
        }
        if (!revisionSummary.hasChanges) {
            setResult({
                type: "error",
                message:
                    "Belum ada perubahan realisasi atau catatan yang perlu disimpan.",
            });
            return;
        }
        for (const state of Object.values(itemStates)) {
            const subtotal = getRealisasiSubtotal(state.realisasiItems);
            const discountAmount = Math.max(0, state.discountAmount ?? 0);

            if (discountAmount > subtotal) {
                setResult({
                    type: "error",
                    message: `Potongan harga item ${state.itemId} tidak boleh lebih besar dari subtotal realisasi.`,
                });
                return;
            }
        }

        setResult(null);

        startTransition(async () => {
            let bapUpload: UploadedBapPdf;
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
                bapPdf: bapUpload,
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
                    message: `${saveRes.message} PDF revisi berhasil dibuat dengan BAP di halaman awal dan di-upload ke Google Drive.`,
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

    const revisionSummary = useMemo(() => {
        if (!report) {
            return {
                beforeTotal: 0,
                afterTotal: 0,
                difference: 0,
                changedItemCount: 0,
                hasChanges: false,
            };
        }

        const revisedItems = buildRevisedItems(report.items, itemStates);
        const changedItemCount = report.items.reduce((count, item) => {
            const state = itemStates[item.itemId];
            if (!state) return count;

            const previousItems = normalizeRealisasiItems(
                item.realisasiItems ?? [],
            );
            const nextItems = normalizeRealisasiItems(state.realisasiItems);
            const previousNotes = normalizeCompletionNotes(
                item.completionNotes,
            );
            const nextNotes = normalizeCompletionNotes(state.completionNotes);
            const previousDiscount = Math.max(0, item.discountAmount ?? 0);
            const nextDiscount = Math.max(0, state.discountAmount ?? 0);
            const hasItemChanged =
                JSON.stringify(previousItems) !== JSON.stringify(nextItems) ||
                previousNotes !== nextNotes ||
                previousDiscount !== nextDiscount;

            return hasItemChanged ? count + 1 : count;
        }, 0);
        const beforeTotal = calculateTotalRealisasiFromItems(report.items);
        const afterTotal = calculateTotalRealisasiFromItems(revisedItems);

        return {
            beforeTotal,
            afterTotal,
            difference: afterTotal - beforeTotal,
            changedItemCount,
            hasChanges: changedItemCount > 0,
        };
    }, [itemStates, report]);

    const canSubmitRevision =
        Boolean(isCompleted) &&
        revisionSummary.hasChanges &&
        Boolean(alasanIntervensi.trim()) &&
        Boolean(bapFile) &&
        !bapFileError;

    return (
        <div className="flex flex-col gap-4">
            <section className="rounded-lg border bg-background">
                <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold">
                                Intervensi Revisi Laporan
                            </h2>
                            <Badge variant="outline">
                                <ShieldAlert data-icon="inline-start" />
                                ADMIN
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Ubah data realisasi laporan final dengan BAP dan PDF
                            revisi.
                        </p>
                    </div>

                    <Alert className="w-full border-amber-200 bg-amber-50 py-2 text-amber-900 lg:max-w-md">
                        <ShieldAlert />
                        <AlertDescription className="text-xs text-amber-800">
                            Wajib BAP dan alasan intervensi karena data laporan
                            sudah selesai.
                        </AlertDescription>
                    </Alert>

                    {hideSearch ? null : (
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full gap-2 lg:w-[420px]"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                                disabled={isPending}
                            >
                                Cari
                            </Button>
                        </form>
                    )}
                </div>

                {report ? (
                    <>
                        <Separator />
                        <div className="grid gap-x-5 gap-y-2 px-4 py-3 text-xs md:grid-cols-3 xl:grid-cols-[minmax(120px,0.9fr)_minmax(220px,1.5fr)_minmax(120px,0.8fr)_minmax(180px,1.1fr)_minmax(120px,0.8fr)_auto] xl:items-end">
                            <InfoField
                                label="No. Laporan"
                                value={report.reportNumber}
                                mono
                            />
                            <InfoField
                                label="Toko"
                                value={
                                    report.storeCode
                                        ? `${report.storeCode} - ${report.storeName}`
                                        : report.storeName
                                }
                            />
                            <InfoField
                                label="Cabang"
                                value={report.branchName}
                            />
                            <InfoField
                                label="BMS"
                                value={`${report.bmsName} (${report.bmsNIK})`}
                            />
                            <InfoField
                                label="Total saat ini"
                                value={fmtCurrency(report.totalReal)}
                                mono
                            />
                            <div className="justify-self-start xl:justify-self-end">
                                <StatusBadge status={report.status} />
                            </div>
                        </div>
                    </>
                ) : null}
            </section>

            {initialQuery && !report ? (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>Laporan tidak ditemukan</AlertTitle>
                    <AlertDescription>
                        Nomor laporan <strong>{initialQuery}</strong> tidak ada
                        di sistem.
                    </AlertDescription>
                </Alert>
            ) : null}

            {report ? (
                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="flex min-w-0 flex-col gap-4">
                        <section className="rounded-lg border bg-background">
                            <div className="flex flex-col gap-1 px-4 py-3">
                                <h3 className="text-sm font-semibold">
                                    Data Realisasi Laporan
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {damagedItems.length} item pekerjaan BMS
                                    dapat direvisi.
                                </p>
                            </div>
                            <Separator />
                            <div className="flex flex-col gap-4 p-4">
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

                                {damagedItems.length === 0 ? (
                                    <p className="py-4 text-center text-sm italic text-muted-foreground">
                                        Tidak ada item BMS yang dapat direvisi.
                                    </p>
                                ) : null}
                            </div>
                        </section>
                    </div>

                    <aside className="flex flex-col gap-4 xl:sticky xl:top-15">
                        <section className="rounded-lg border bg-background">
                            <div className="px-4 py-3">
                                <h3 className="text-sm font-semibold">
                                    Ringkasan Revisi
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    PDF revisi akan digabung dengan BAP di
                                    halaman awal.
                                </p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-3 p-4 text-xs">
                                <SummaryMetric
                                    label="Sebelum"
                                    value={fmtCurrency(
                                        revisionSummary.beforeTotal,
                                    )}
                                />
                                <SummaryMetric
                                    label="Sesudah"
                                    value={fmtCurrency(
                                        revisionSummary.afterTotal,
                                    )}
                                />
                                <SummaryMetric
                                    label="Selisih"
                                    value={formatSignedCurrency(
                                        revisionSummary.difference,
                                    )}
                                />
                                <SummaryMetric
                                    label="Item berubah"
                                    value={`${revisionSummary.changedItemCount} item`}
                                />
                            </div>
                            {report.reportFinalDriveUrl ||
                            report.completedPdfPath ? (
                                <>
                                    <Separator />
                                    <div className="p-4 pt-3">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            id="btn-view-original-pdf"
                                        >
                                            <a
                                                href={
                                                    report.reportFinalDriveUrl ??
                                                    report.completedPdfPath ??
                                                    "#"
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <FileText data-icon="inline-start" />
                                                Lihat PDF Asli
                                            </a>
                                        </Button>
                                    </div>
                                </>
                            ) : null}
                        </section>

                        <section className="rounded-lg border bg-background">
                            <div className="px-4 py-3">
                                <h3 className="text-sm font-semibold">
                                    Simpan Intervensi
                                </h3>
                            </div>
                            <Separator />
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-2">
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
                                        className="min-h-[88px] resize-y text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="bap-pdf-upload">
                                        Upload BAP PDF{" "}
                                        <span className="text-destructive">
                                            *
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
                                    <p className="text-xs text-muted-foreground">
                                        Format PDF, maksimal 12 MB.
                                    </p>
                                    {bapFile ? (
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
                                                <X />
                                            </Button>
                                        </div>
                                    ) : null}
                                    {bapFileError ? (
                                        <p className="text-xs text-destructive">
                                            {bapFileError}
                                        </p>
                                    ) : null}
                                </div>

                                {!isCompleted ? (
                                    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                        <AlertCircle />
                                        <AlertTitle>
                                            Laporan belum selesai
                                        </AlertTitle>
                                        <AlertDescription className="text-amber-800">
                                            Status saat ini{" "}
                                            <strong>{report.status}</strong>.
                                            Intervensi hanya untuk laporan
                                            COMPLETED.
                                        </AlertDescription>
                                    </Alert>
                                ) : null}

                                {result ? (
                                    <ResultFeedback result={result} />
                                ) : null}

                                <Button
                                    id="btn-apply-revision"
                                    onClick={handleSaveAndGenerate}
                                    disabled={!canSubmitRevision || isPending}
                                    className="w-full"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2
                                                data-icon="inline-start"
                                                className="animate-spin"
                                            />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <Save data-icon="inline-start" />
                                            Simpan & Generate PDF
                                        </>
                                    )}
                                </Button>

                                {hasExistingRevision && !result ? (
                                    <p className="text-center text-[11px] text-muted-foreground">
                                        Sudah ada revisi sebelumnya. Menyimpan
                                        akan membuat versi revisi baru.
                                    </p>
                                ) : null}
                            </div>
                        </section>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}

function InfoField({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] uppercase text-muted-foreground">
                {label}
            </p>
            <p
                className={
                    mono
                        ? "truncate font-mono font-medium"
                        : "truncate font-medium"
                }
            >
                {value}
            </p>
        </div>
    );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">
                {label}
            </p>
            <p className="truncate font-mono text-sm font-semibold">{value}</p>
        </div>
    );
}

function ResultFeedback({ result }: { result: RevisionResult }) {
    const isSuccess = result.type === "success";

    return (
        <Alert
            variant={isSuccess ? "default" : "destructive"}
            className={
                isSuccess
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : undefined
            }
        >
            {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
            <AlertTitle>
                {isSuccess ? "Intervensi tersimpan" : "Intervensi gagal"}
            </AlertTitle>
            <AlertDescription
                className={isSuccess ? "text-emerald-800" : undefined}
            >
                {result.message}
            </AlertDescription>

            {isSuccess && (result.revisedPdfUrl || result.folderUrl) ? (
                <div className="col-start-2 mt-2 flex flex-col gap-2">
                    {result.revisedPdfUrl ? (
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={result.revisedPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FileText data-icon="inline-start" />
                                Buka PDF Revisi
                            </a>
                        </Button>
                    ) : null}
                    {result.folderUrl ? (
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={result.folderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FolderOpen data-icon="inline-start" />
                                Buka Folder Drive
                            </a>
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </Alert>
    );
}
