"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { compressAndUploadToUT } from "@/lib/upload-photo";
import { Loader2 } from "lucide-react";

import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

import { ReportSelectDialog } from "./components/report-select-dialog";
import { CompletionChecklistStep } from "./components/completion-checklist-step";
import { createInitialItemState } from "./types";

import { submitCompletionWork } from "@/app/reports/actions/submit-completion-work";
import { fetchReportForCompletion } from "./actions";
import type { WorkableReport, ReportForCompletion } from "./queries";
import type { CompletionDraftData, CompletionItemState } from "./types";
import { useCompletionAutosave } from "./hooks/use-completion-autosave";
import { realisasiGrandTotal } from "./types";
import { useRouter } from "next/navigation";
import type {
    MaterialEstimationJson,
    RealisasiItemJson,
    ReportItemJson,
} from "@/types/report";

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraTarget =
    | { target: "item"; itemId: string; type: "after" }
    | { target: "additional" }
    | null;

interface Props {
    workableReports: WorkableReport[];
    userNIK: string;
    userName: string;
    /** If set, skip the dialog and auto-load this report on mount */
    prefillReport?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRemotePhoto(url: string, idx: number) {
    return { id: `remote-${idx}-${url}`, previewUrl: url };
}

function parseStringArray(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
        );
    }

    if (typeof raw === "string" && raw.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(
                    (value): value is string =>
                        typeof value === "string" && value.trim().length > 0,
                );
            }
        } catch {
            return [];
        }
    }

    return [];
}

function toRealisasiEntries(
    itemId: string,
    realisasiItems: RealisasiItemJson[],
): CompletionItemState["realisasiEntries"] {
    return realisasiItems.map((entry, idx) => ({
        id: `db-${itemId}-${idx}-${Date.now()}`,
        materialName: entry.materialName,
        quantity: entry.quantity,
        unit: entry.unit,
        price: entry.price,
    }));
}

function buildItemStates(
    report: ReportForCompletion,
): Map<string, CompletionItemState> {
    const map = new Map<string, CompletionItemState>();
    if (!report) return map;

    // Build estimation lookup
    const estMap = new Map<string, MaterialEstimationJson[]>();
    for (const e of report.estimations) {
        if (!estMap.has(e.itemId)) estMap.set(e.itemId, []);
        estMap.get(e.itemId)!.push(e);
    }

    for (const item of report.items as ReportItemJson[]) {
        const isDamaged =
            item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";
        if (isDamaged && item.handler === "BMS") {
            const baseState = createInitialItemState(
                estMap.get(item.itemId) ?? [],
            );
            const existingAfterImages = parseStringArray(item.afterImages);
            const existingRealisasi = Array.isArray(item.realisasiItems)
                ? item.realisasiItems
                : [];

            map.set(item.itemId, {
                ...baseState,
                afterPhotos:
                    existingAfterImages.length > 0
                        ? existingAfterImages.map((url, idx) =>
                              toRemotePhoto(url, idx),
                          )
                        : baseState.afterPhotos,
                realisasiEntries:
                    existingRealisasi.length > 0
                        ? toRealisasiEntries(item.itemId, existingRealisasi)
                        : baseState.realisasiEntries,
                notes: item.completionNotes?.trim() || "",
            });
        }
    }
    return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompleteForm({
    workableReports,
    userNIK,
    userName,
    prefillReport,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // ── Dialog ────────────────────────────────────────────────────────────────
    const [dialogOpen, setDialogOpen] = useState(!prefillReport);
    const [isFetchingReport, setIsFetchingReport] = useState(!!prefillReport);

    // ── Report + form state ───────────────────────────────────────────────────
    const [currentReport, setCurrentReport] =
        useState<ReportForCompletion>(null);
    const [itemStates, setItemStates] = useState<
        Map<string, CompletionItemState>
    >(new Map());
    const [globalNotes, setGlobalNotes] = useState<string>("");
    const [additionalDocumentationPhotos, setAdditionalDocumentationPhotos] =
        useState<Array<{ id: string; previewUrl: string }>>([]);
    const [additionalDocumentationNote, setAdditionalDocumentationNote] =
        useState("");

    // ── Camera state ─────────────────────────────────────────────────────────
    const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);

    // ── Autosave ──────────────────────────────────────────────────────────────
    const reportNumberRef = useRef<string | null>(null);
    const autosave = useCompletionAutosave();

    // ─── Helper: build draft data from current state ─────────────────────────
    const buildDraftData = useCallback(
        (
            rn: string,
            notes: string,
            states: Map<string, CompletionItemState>,
        ): CompletionDraftData => ({
            version: 1,
            reportNumber: rn,
            savedAt: new Date().toISOString(),
            globalNotes: notes,
            selfiePhotoIds: [],
            itemStates: Object.fromEntries(
                [...states.entries()].map(([itemId, s]) => [
                    itemId,
                    {
                        afterPhotoIds: s.afterPhotos.map((p) => p.id),
                        realisasiEntries: s.realisasiEntries,
                        materialStores: s.materialStores,
                        receiptPhotoIds: [],
                        notes: s.notes,
                    },
                ]),
            ),
        }),
        [],
    );

    // ─── Trigger autosave whenever state changes ──────────────────────────────
    const triggerAutosave = useCallback(
        (notes: string, states: Map<string, CompletionItemState>) => {
            const rn = reportNumberRef.current;
            if (!rn) return;
            autosave.triggerSave(rn, buildDraftData(rn, notes, states));
        },
        [autosave, buildDraftData],
    );

    // ─── Load a report and restore draft if available ─────────────────────────
    const loadReport = useCallback(
        async (reportNumber: string) => {
            const report = await fetchReportForCompletion(reportNumber);
            if (!report) {
                toast.error("Laporan tidak ditemukan atau tidak dapat diakses");
                setDialogOpen(true);
                return;
            }

            reportNumberRef.current = reportNumber;

            // Try to restore draft first
            const draft = await autosave.restoreDraft(reportNumber);
            if (draft) {
                toast.info(
                    "Draft tersimpan ditemukan, data berhasil dipulihkan",
                    {
                        duration: 3000,
                    },
                );
                setCurrentReport(report);
                setGlobalNotes(draft.globalNotes);
                setAdditionalDocumentationPhotos([]);
                setAdditionalDocumentationNote("");

                // Merge draft with fresh item states (in case new items were added)
                const freshStates = buildItemStates(report);
                const mergedStates = new Map(freshStates);
                for (const [itemId, draftState] of draft.itemStates) {
                    if (mergedStates.has(itemId)) {
                        mergedStates.set(itemId, draftState);
                    }
                }
                setItemStates(mergedStates);
            } else {
                setCurrentReport(report);
                setItemStates(buildItemStates(report));
                setGlobalNotes(report.completionNotes?.trim() || "");

                const additionalPhotoUrls = parseStringArray(
                    report.completionAdditionalPhotos,
                );
                setAdditionalDocumentationPhotos(
                    additionalPhotoUrls.map((url, idx) =>
                        toRemotePhoto(url, idx),
                    ),
                );
                setAdditionalDocumentationNote(
                    report.completionAdditionalNote?.trim() || "",
                );
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // ── Auto-load prefilled report on mount ───────────────────────────────────
    useEffect(() => {
        if (!prefillReport) return;
        reportNumberRef.current = prefillReport;
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
            reportNumberRef.current = reportNumber;
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
    const handleOpenCamera = useCallback((itemId: string, type: "after") => {
        setCameraTarget({ target: "item", itemId, type });
    }, []);

    const handleOpenAdditionalCamera = useCallback(() => {
        setCameraTarget({ target: "additional" });
    }, []);

    const handlePhotoCaptured = useCallback(
        async (file: File) => {
            if (!cameraTarget || !currentReport) return;
            setCameraTarget(null);

            if (cameraTarget.target === "additional") {
                const rn = reportNumberRef.current!;
                const photo = await autosave.addPhoto(
                    rn,
                    file,
                    `additional-doc-${Date.now()}`,
                );
                setAdditionalDocumentationPhotos((prev) => [...prev, photo]);
                return;
            }

            const { itemId, type } = cameraTarget;
            const rn = reportNumberRef.current!;
            const photo = await autosave.addPhoto(
                rn,
                file,
                `${type}-${itemId}`,
            );
            setItemStates((prev) => {
                const next = new Map(prev);
                const s = next.get(itemId);
                if (!s) return prev;
                const updated: CompletionItemState = {
                    ...s,
                    afterPhotos: [...s.afterPhotos, photo],
                };
                next.set(itemId, updated);
                triggerAutosave(globalNotes, next);
                return next;
            });
        },
        [cameraTarget, currentReport, autosave, globalNotes, triggerAutosave],
    );

    // ── Item state change ─────────────────────────────────────────────────────
    const handleItemChange = useCallback(
        (itemId: string, patch: Partial<CompletionItemState>) => {
            setItemStates((prev) => {
                const next = new Map(prev);
                const s = next.get(itemId);
                if (!s) return prev;
                const updated = { ...s, ...patch };
                next.set(itemId, updated);
                triggerAutosave(globalNotes, next);
                return next;
            });
        },
        [globalNotes, triggerAutosave],
    );

    const handleGlobalNotesChange = useCallback(
        (value: string) => {
            setGlobalNotes(value);
            triggerAutosave(value, itemStates);
        },
        [itemStates, triggerAutosave],
    );

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(() => {
        if (!currentReport) return;

        const damagedBmsItems = currentReport.items.filter(
            (item) =>
                (item.condition === "RUSAK" ||
                    item.preventiveCondition === "NOT_OK") &&
                item.handler === "BMS",
        );

        // Validate each item before uploading
        for (const item of damagedBmsItems) {
            const state = itemStates.get(item.itemId);
            if (!state) continue;

            if (state.afterPhotos.length === 0) {
                toast.error("Foto sesudah wajib diisi", {
                    description: `Item: ${item.itemName}`,
                });
                document
                    .getElementById(`item-${item.itemId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
            if (state.realisasiEntries.length === 0) {
                toast.error("Realisasi biaya wajib diisi", {
                    description: `Item: ${item.itemName}`,
                });
                return;
            }
            if (
                state.realisasiEntries.some(
                    (e) => !e.materialName.trim() || e.price < 0,
                )
            ) {
                toast.error(
                    "Semua baris realisasi harus memiliki nama barang dan harga tidak boleh minus",
                    { description: `Item: ${item.itemName}` },
                );
                return;
            }
        }

        startTransition(async () => {
            const rn = currentReport.reportNumber;

            const loadingId = toast.loading(
                "Mengunggah foto dan mengirim laporan...",
            );

            // ── Upload item photos & build completion items ──────────────────
            const completionItems: import("@/app/reports/actions/submit-completion-work").CompletionItemInput[] =
                [];
            const allCompletionFileKeys: string[] = [];

            for (const item of damagedBmsItems) {
                const state = itemStates.get(item.itemId);
                if (!state) continue;

                // Upload after photos
                const afterImages: string[] = [];
                for (const photo of state.afterPhotos) {
                    // Remote photos (already uploaded) — keep URL as-is
                    if (photo.id.startsWith("remote-") && photo.previewUrl) {
                        afterImages.push(photo.previewUrl);
                        continue;
                    }

                    const file = await autosave.getPhotoFile(photo.id);
                    if (!file) {
                        toast.error(
                            `Gagal memuat foto sesudah untuk item ${item.itemName}`,
                            { id: loadingId },
                        );
                        return;
                    }
                    const result = await compressAndUploadToUT(
                        file,
                        "completionPhotoUploader",
                    );
                    if (!result) {
                        toast.error("Gagal mengunggah foto sesudah", {
                            id: loadingId,
                        });
                        return;
                    }
                    afterImages.push(result.url);
                    allCompletionFileKeys.push(result.key);
                }

                completionItems.push({
                    itemId: item.itemId,
                    afterImages,
                    realisasiItems: state.realisasiEntries.map((e) => ({
                        materialName: e.materialName,
                        quantity: e.quantity,
                        unit: e.unit,
                        price: e.price,
                        totalPrice: e.quantity * e.price,
                    })),
                    actualCost: realisasiGrandTotal(state.realisasiEntries),
                    materialStores: [],
                    receiptImages: [],
                    notes: state.notes.trim() || undefined,
                });
            }

            // ── Upload additional documentation photos ───────────────────────
            const additionalPhotoUrls: string[] = [];
            for (const photo of additionalDocumentationPhotos) {
                if (photo.id.startsWith("remote-") && photo.previewUrl) {
                    additionalPhotoUrls.push(photo.previewUrl);
                    continue;
                }

                const file = await autosave.getPhotoFile(photo.id);
                if (!file) {
                    toast.error("Gagal memuat dokumentasi tambahan", {
                        id: loadingId,
                    });
                    return;
                }
                const result = await compressAndUploadToUT(
                    file,
                    "completionPhotoUploader",
                );
                if (!result) {
                    toast.error("Gagal mengunggah dokumentasi tambahan", {
                        id: loadingId,
                    });
                    return;
                }
                additionalPhotoUrls.push(result.url);
                allCompletionFileKeys.push(result.key);
            }

            // ── Call server action ───────────────────────────────────────────
            const result = await submitCompletionWork(
                rn,
                completionItems,
                [],
                {
                    photos: additionalPhotoUrls,
                    note: additionalDocumentationNote.trim() || undefined,
                },
                globalNotes.trim() || undefined,
                allCompletionFileKeys,
            );

            if (result.error) {
                toast.error("Gagal mengajukan penyelesaian", {
                    id: loadingId,
                    description: result.error,
                });
            } else {
                await autosave.clearDraft(rn);
                toast.success("Laporan penyelesaian berhasil dikirim!", {
                    id: loadingId,
                });
                router.push(`/reports/${rn}`);
            }
        });
    }, [
        currentReport,
        itemStates,
        globalNotes,
        additionalDocumentationPhotos,
        additionalDocumentationNote,
        autosave,
        startTransition,
        router,
    ]);

    // Back = reopen dialog
    const handleBack = useCallback(() => setDialogOpen(true), []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <ReportSelectDialog
                open={dialogOpen}
                reports={workableReports}
                onSelect={handleReportSelect}
                onCancel={handleDialogCancel}
            />

            {isFetchingReport && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {!isFetchingReport && currentReport && (
                <>
                    <LoadingOverlay
                        isOpen={isPending}
                        message="Mengunggah foto dan mengirim laporan..."
                    />
                    <CameraModal
                        isOpen={cameraTarget !== null}
                        onClose={() => setCameraTarget(null)}
                        onCapture={handlePhotoCaptured}
                        watermarkInfo={{
                            name: userName,
                            nik: userNIK,
                            role: "BMS",
                            storeInfo: `Toko: ${currentReport.storeName}`,
                        }}
                    />
                    <CompletionChecklistStep
                        report={currentReport}
                        itemStates={itemStates}
                        onItemChange={handleItemChange}
                        onOpenCamera={handleOpenCamera}
                        globalNotes={globalNotes}
                        onGlobalNotesChange={handleGlobalNotesChange}
                        additionalDocumentationPhotos={
                            additionalDocumentationPhotos
                        }
                        onAdditionalDocumentationPhotosChange={
                            setAdditionalDocumentationPhotos
                        }
                        additionalDocumentationNote={
                            additionalDocumentationNote
                        }
                        onAdditionalDocumentationNoteChange={
                            setAdditionalDocumentationNote
                        }
                        onOpenAdditionalCamera={handleOpenAdditionalCamera}
                        isPending={isPending}
                        onBack={handleBack}
                        onSubmit={handleSubmit}
                    />
                </>
            )}
        </>
    );
}
