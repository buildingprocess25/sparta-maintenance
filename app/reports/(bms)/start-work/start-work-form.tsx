"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
    type ChangeEvent,
} from "react";
import { toast } from "sonner";
import { genPhotoId } from "@/lib/upload-photo";
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import {
    Camera,
    ImagePlus,
    Loader2,
    MapPin,
    Plus,
    ReceiptText,
    SkipForward,
    Store,
    Trash2,
    User,
    WrenchIcon,
    X,
    ZoomIn,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { StartReportSelectDialog } from "./components/start-report-select-dialog";
import { fetchReportForStartWork } from "./actions";
import { startWorkWithPhotos } from "@/app/reports/actions/start-work-with-photos";
import type { StartableReport, ReportForStartWork } from "./queries";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import type { MaterialEstimationJson } from "@/types/report";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true when total estimated cost across all items is exactly Rp 0. */
function isTotalEstimationZero(
    report: NonNullable<ReportForStartWork>,
): boolean {
    const estimations = report.estimations as MaterialEstimationJson[];
    if (!Array.isArray(estimations) || estimations.length === 0) return true;
    return estimations.reduce((sum, e) => sum + (e.totalPrice ?? 0), 0) === 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraTarget = "selfie" | "receipt" | "store" | null;

interface LocalPhoto {
    id: string;
    previewUrl: string;
    file: File;
    /** Google Drive CDN file ID — populated after successful upload */
    fileId?: string;
}

interface MaterialStoreEntry {
    id: string;
    name: string;
    city: string;
}

interface Props {
    startableReports: StartableReport[];
    userNIK: string;
    userName: string;
    /** If set, skip the dialog and auto-load this report on mount */
    prefillReport?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
    return genPhotoId();
}

// ─── Photo Thumbnails ─────────────────────────────────────────────────────────

function PhotoThumbnails({
    photos,
    onRemove,
    onPreview,
}: {
    photos: LocalPhoto[];
    onRemove: (id: string) => void;
    onPreview: (url: string) => void;
}) {
    if (photos.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-3 mb-3">
            {photos.map((p) => (
                <div key={p.id} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={p.previewUrl}
                        alt="Foto"
                        className="h-32 w-32 object-cover rounded-lg border-2 border-green-200 cursor-zoom-in"
                        onClick={() => onPreview(p.previewUrl)}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StartWorkForm({
    startableReports,
    userName,
    userNIK,
    prefillReport,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { uploadPhoto } = usePhotoUpload();

    // ── Dialog ────────────────────────────────────────────────────────────────
    const [dialogOpen, setDialogOpen] = useState(!prefillReport);
    const [isFetchingReport, setIsFetchingReport] = useState(!!prefillReport);

    // ── Report + form state ───────────────────────────────────────────────────
    const [currentReport, setCurrentReport] =
        useState<ReportForStartWork>(null);
    const [selfiePhotos, setSelfiePhotos] = useState<LocalPhoto[]>([]);
    const [materialStorePhotos, setMaterialStorePhotos] = useState<
        LocalPhoto[]
    >([]);
    const [receiptPhotos, setReceiptPhotos] = useState<LocalPhoto[]>([]);
    const [materialStores, setMaterialStores] = useState<MaterialStoreEntry[]>(
        [],
    );
    /** Whether BMS has opted to skip selfie/receipt because there is no cost. */
    const [skipPhotos, setSkipPhotos] = useState(false);

    const storeGalleryInputRef = useRef<HTMLInputElement>(null);

    // ── Camera state ─────────────────────────────────────────────────────────
    const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);

    // ── Preview lightbox ──────────────────────────────────────────────────────
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const closePreview = useHistoryBackClose(!!previewUrl, () =>
        setPreviewUrl(null),
    );

    // ── Load report ───────────────────────────────────────────────────────────
    const loadReport = useCallback(async (reportNumber: string) => {
        const report = await fetchReportForStartWork(reportNumber);
        if (!report) {
            toast.error("Laporan tidak ditemukan atau tidak dapat diakses");
            setDialogOpen(true);
            return;
        }
        setCurrentReport(report);
        setSelfiePhotos([]);
        setMaterialStorePhotos([]);
        setReceiptPhotos([]);
        setMaterialStores([]);
        setSkipPhotos(false);
    }, []);

    // ── Auto-load prefilled report on mount ───────────────────────────────────
    useEffect(() => {
        if (!prefillReport) return;
        loadReport(prefillReport)
            .catch(() => {
                toast.error("Gagal memuat data laporan");
                setDialogOpen(true);
            })
            .finally(() => setIsFetchingReport(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Report selection ──────────────────────────────────────────────────────
    const handleReportSelect = useCallback(
        async (reportNumber: string) => {
            setDialogOpen(false);
            setIsFetchingReport(true);
            try {
                await loadReport(reportNumber);
            } catch {
                toast.error("Gagal memuat data laporan");
                setDialogOpen(true);
            } finally {
                setIsFetchingReport(false);
            }
        },
        [loadReport],
    );

    const handleDialogCancel = useCallback(() => {
        setDialogOpen(false);
        if (!currentReport) router.push("/dashboard");
    }, [currentReport, router]);

    // ── Camera handlers ───────────────────────────────────────────────────────
    const handleAddMaterialStorePhoto = useCallback((file: File) => {
        const id = genId();
        const previewUrl = URL.createObjectURL(file);
        const photo: LocalPhoto = { id, previewUrl, file };
        setMaterialStorePhotos((prev) => [...prev, photo]);
    }, []);

    const handlePhotoCaptured = useCallback(
        (file: File) => {
            if (!cameraTarget) return;
            setCameraTarget(null);

            if (cameraTarget === "store") {
                handleAddMaterialStorePhoto(file);
                return;
            }

            const id = genId();
            const previewUrl = URL.createObjectURL(file);
            const photo: LocalPhoto = { id, previewUrl, file };

            if (cameraTarget === "selfie") {
                setSelfiePhotos((prev) => [...prev, photo]);
            } else {
                setReceiptPhotos((prev) => {
                    const next = [...prev, photo];
                    // Auto-add a store entry when first receipt is added
                    if (prev.length === 0) {
                        setMaterialStores([
                            { id: genId(), name: "", city: "" },
                        ]);
                    }
                    return next;
                });
            }
        },
        [cameraTarget, handleAddMaterialStorePhoto],
    );

    const handleRemoveSelfiePhoto = useCallback((id: string) => {
        setSelfiePhotos((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const handleRemoveReceiptPhoto = useCallback((id: string) => {
        setReceiptPhotos((prev) => {
            const next = prev.filter((p) => p.id !== id);
            if (next.length === 0) setMaterialStores([]);
            return next;
        });
    }, []);

    const handleRemoveStorePhoto = useCallback((id: string) => {
        setMaterialStorePhotos((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const handleOpenStoreGallery = useCallback(() => {
        storeGalleryInputRef.current?.click();
    }, []);

    const handleStoreGalleryChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            files.forEach((file) => handleAddMaterialStorePhoto(file));
            event.target.value = "";
        },
        [handleAddMaterialStorePhoto],
    );

    // ── Material store handlers ───────────────────────────────────────────────
    const handleAddStore = useCallback(() => {
        setMaterialStores((prev) => [
            ...prev,
            { id: genId(), name: "", city: "" },
        ]);
    }, []);

    const handleRemoveStore = useCallback((id: string) => {
        setMaterialStores((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const handleStoreChange = useCallback(
        (id: string, field: "name" | "city", value: string) => {
            setMaterialStores((prev) =>
                prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
            );
        },
        [],
    );

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(() => {
        if (!currentReport) return;

        const isZeroCost = isTotalEstimationZero(currentReport);

        // When photos are not skipped, enforce all photo + store requirements
        if (!skipPhotos) {
            if (selfiePhotos.length === 0) {
                toast.error("Foto selfie bersama pejabat toko wajib diunggah");
                return;
            }

            if (materialStorePhotos.length === 0) {
                toast.error("Foto toko material wajib diunggah");
                return;
            }

            if (receiptPhotos.length === 0) {
                toast.error("Foto nota/struk wajib diunggah");
                return;
            }

            if (
                materialStores.length === 0 ||
                materialStores.some((s) => !s.name.trim() || !s.city.trim())
            ) {
                toast.error(
                    "Semua toko material harus memiliki nama dan alamat",
                );
                return;
            }
        }

        // Guard: skip is only valid when estimation truly is zero
        if (skipPhotos && !isZeroCost) {
            toast.error(
                "Lewati foto hanya diperbolehkan jika total estimasi adalah Rp 0",
            );
            return;
        }

        startTransition(async () => {
            const rn = currentReport.reportNumber;

            const loadingId = toast.loading(
                "Mengunggah foto dan memulai pengerjaan...",
            );

            // ── Upload selfie photos ─────────────────────────────────────────
            const uploadedSelfieUrls: string[] = [];
            const uploadedSelfieFileIds: string[] = [];
            for (const photo of selfiePhotos) {
                const result = await uploadPhoto(photo.file);
                if (!result) {
                    toast.dismiss(loadingId);
                    toast.error("Gagal mengunggah foto selfie");
                    return;
                }
                uploadedSelfieUrls.push(result.url);
                uploadedSelfieFileIds.push(result.fileId);
            }

            // ── Upload receipt photos ────────────────────────────────────────
            const uploadedReceiptUrls: string[] = [];
            const uploadedReceiptFileIds: string[] = [];
            for (const photo of receiptPhotos) {
                const result = await uploadPhoto(photo.file);
                if (!result) {
                    toast.dismiss(loadingId);
                    toast.error("Gagal mengunggah foto nota");
                    return;
                }
                uploadedReceiptUrls.push(result.url);
                uploadedReceiptFileIds.push(result.fileId);
            }

            // ── Upload material store photos ───────────────────────────────
            const uploadedStoreUrls: string[] = [];
            const uploadedStoreFileIds: string[] = [];
            for (const photo of materialStorePhotos) {
                const result = await uploadPhoto(photo.file);
                if (!result) {
                    toast.dismiss(loadingId);
                    toast.error("Gagal mengunggah foto toko material");
                    return;
                }
                uploadedStoreUrls.push(result.url);
                uploadedStoreFileIds.push(result.fileId);
            }

            // ── Call server action ────────────────────────────────────────────
            const result = await startWorkWithPhotos(rn, {
                selfieUrls: uploadedSelfieUrls,
                selfieFileIds: uploadedSelfieFileIds,
                receiptUrls: uploadedReceiptUrls,
                receiptFileIds: uploadedReceiptFileIds,
                materialStores: materialStores.map((store, index) => ({
                    name: store.name.trim(),
                    city: store.city.trim(),
                    ...(index === 0 && uploadedStoreUrls.length > 0
                        ? { photoUrls: uploadedStoreUrls }
                        : {}),
                })),
                materialStorePhotoFileIds: uploadedStoreFileIds,
                skipPhotos,
            });

            toast.dismiss(loadingId);

            if (result.error) {
                toast.error("Gagal memulai pengerjaan", {
                    description: result.error,
                });
                return;
            }

            toast.success("Pengerjaan dimulai!", {
                description:
                    "Status laporan diubah menjadi 'Sedang Dikerjakan'.",
            });
            router.push(`/reports/${rn}`);
        });
    }, [
        currentReport,
        skipPhotos,
        selfiePhotos,
        receiptPhotos,
        materialStorePhotos,
        materialStores,
        router,
    ]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Report select dialog */}
            <StartReportSelectDialog
                open={dialogOpen}
                reports={startableReports}
                onSelect={handleReportSelect}
                onCancel={handleDialogCancel}
            />

            {/* Loading overlay when fetching report */}
            {isFetchingReport && (
                <LoadingOverlay isOpen message="Memuat data laporan..." />
            )}

            {/* Camera modal */}
            <CameraModal
                isOpen={cameraTarget !== null}
                onCapture={handlePhotoCaptured}
                onClose={() => setCameraTarget(null)}
                watermarkInfo={
                    currentReport
                        ? {
                              name: userName,
                              nik: userNIK,
                              role: "BMS",
                              storeInfo: `Toko: ${currentReport.storeName}`,
                          }
                        : undefined
                }
            />

            {/* Photo preview lightbox */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview Foto"
                            className="w-full h-full object-contain rounded-lg max-h-[85vh]"
                        />
                        <button
                            onClick={closePreview}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Main content — shown once a report is loaded */}
            {currentReport && (
                <div className="flex flex-col max-w-5xl mx-auto w-full gap-4 md:gap-8">
                    {/* ── Report Info ──────────────────────────────────────── */}
                    <Card className="py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                        <CardHeader className="px-1 md:px-6">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                {currentReport.storeName}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {currentReport.reportNumber} ·{" "}
                                {currentReport.branchName}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* ── Zero-cost skip option ─────────────────────────── */}
                    {isTotalEstimationZero(currentReport) && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
                            <div className="flex items-center gap-3 w-full">
                                <Checkbox
                                    id="skip-photos"
                                    checked={skipPhotos}
                                    onCheckedChange={(checked) =>
                                        setSkipPhotos(checked === true)
                                    }
                                    className="bg-white dark:bg-input/30 border-amber-400"
                                />
                                <label
                                    htmlFor="skip-photos"
                                    className="flex-1 cursor-pointer"
                                >
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                        Estimasi Rp 0 — Lewati foto selfie &amp;
                                        nota
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 opacity-80">
                                        Centang ini jika tidak ada pembelian
                                        material (tanpa biaya). Foto selfie,
                                        toko material, dan nota tidak
                                        diperlukan.
                                    </p>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── Selfie Section ───────────────────────────────────── */}
                    <Card
                        className={
                            skipPhotos
                                ? "opacity-40 pointer-events-none select-none"
                                : ""
                        }
                    >
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Foto Selfie{" "}
                                {!skipPhotos && (
                                    <span className="text-destructive text-sm font-normal">
                                        *
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {skipPhotos
                                    ? "Dilewati — estimasi tanpa biaya"
                                    : "Foto selfie bersama pejabat toko Alfamart di lokasi, beserta foto barang, sebagai bukti kehadiran"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PhotoThumbnails
                                photos={selfiePhotos}
                                onRemove={handleRemoveSelfiePhoto}
                                onPreview={setPreviewUrl}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size={
                                    selfiePhotos.length > 0 ? "sm" : "default"
                                }
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 hover:text-blue-700"
                                onClick={() => setCameraTarget("selfie")}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                {selfiePhotos.length > 0
                                    ? "Tambah Selfie"
                                    : "Buka Kamera"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Foto Toko Material Section ───────────────────── */}
                    <Card
                        className={
                            skipPhotos
                                ? "opacity-40 pointer-events-none select-none"
                                : ""
                        }
                    >
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                Foto Toko Material{" "}
                                {!skipPhotos && (
                                    <span className="text-destructive text-sm font-normal">
                                        *
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {skipPhotos
                                    ? "Dilewati — estimasi tanpa biaya"
                                    : "Foto tampak depan toko material sebagai bukti pembelian"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <PhotoThumbnails
                                photos={materialStorePhotos}
                                onRemove={handleRemoveStorePhoto}
                                onPreview={setPreviewUrl}
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size={
                                        materialStorePhotos.length > 0
                                            ? "sm"
                                            : "default"
                                    }
                                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 hover:text-indigo-700"
                                    onClick={() => setCameraTarget("store")}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    {materialStorePhotos.length > 0
                                        ? "Tambah Foto"
                                        : "Buka Kamera"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size={
                                        materialStorePhotos.length > 0
                                            ? "sm"
                                            : "default"
                                    }
                                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 hover:text-indigo-700"
                                    onClick={handleOpenStoreGallery}
                                >
                                    <ImagePlus className="mr-2 h-4 w-4" />
                                    Pilih dari Galeri
                                </Button>
                            </div>
                            <input
                                ref={storeGalleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleStoreGalleryChange}
                            />
                        </CardContent>
                    </Card>

                    {/* ── Nota / Receipt Section ───────────────────────────── */}
                    <Card
                        className={
                            skipPhotos
                                ? "opacity-40 pointer-events-none select-none"
                                : ""
                        }
                    >
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ReceiptText className="h-4 w-4 text-primary" />
                                Foto Nota / Struk{" "}
                                {!skipPhotos && (
                                    <span className="text-destructive text-sm font-normal">
                                        *
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {skipPhotos
                                    ? "Dilewati — estimasi tanpa biaya"
                                    : "Foto nota atau struk pembelian material yang dibawa ke lokasi"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <PhotoThumbnails
                                    photos={receiptPhotos}
                                    onRemove={handleRemoveReceiptPhoto}
                                    onPreview={setPreviewUrl}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size={
                                        receiptPhotos.length > 0
                                            ? "sm"
                                            : "default"
                                    }
                                    className="bg-green-500/10 hover:bg-green-500/20 text-green-600 hover:text-green-700"
                                    onClick={() => setCameraTarget("receipt")}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    {receiptPhotos.length > 0
                                        ? "Tambah Nota"
                                        : "Foto Nota"}
                                </Button>
                            </div>

                            {/* Toko Material — only shown when receipt photos exist */}
                            {receiptPhotos.length > 0 && (
                                <div className="space-y-3 pt-2 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-sm font-semibold">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            Toko Material{" "}
                                            <span className="text-destructive font-normal">
                                                *
                                            </span>
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={handleAddStore}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Tambah Toko
                                        </Button>
                                    </div>

                                    {materialStores.map((store, idx) => (
                                        <div
                                            key={store.id}
                                            className="flex gap-2 items-start"
                                        >
                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">
                                                        Nama Toko
                                                    </Label>
                                                    <Input
                                                        placeholder="Nama toko..."
                                                        value={store.name}
                                                        onChange={(e) =>
                                                            handleStoreChange(
                                                                store.id,
                                                                "name",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">
                                                        Alamat
                                                    </Label>
                                                    <Input
                                                        placeholder="Alamat..."
                                                        value={store.city}
                                                        onChange={(e) =>
                                                            handleStoreChange(
                                                                store.id,
                                                                "city",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-9 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            {materialStores.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveStore(
                                                            store.id,
                                                        )
                                                    }
                                                    className="mt-6 text-destructive hover:text-destructive/80 transition-colors"
                                                    aria-label={`Hapus toko ${idx + 1}`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Action Buttons ───────────────────────────────────── */}
                    <div className="mt-4 md:mt-0">
                        <ButtonGroup className="w-full md:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(true)}
                                disabled={isPending}
                                className="flex-1"
                            >
                                Pilih Laporan Lain
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isPending}
                                className="flex-1"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <WrenchIcon className="h-4 w-4 mr-2" />
                                        Mulai Pengerjaan
                                    </>
                                )}
                            </Button>
                        </ButtonGroup>
                    </div>
                </div>
            )}
        </>
    );
}
