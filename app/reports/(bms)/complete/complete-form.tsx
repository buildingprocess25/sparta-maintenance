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
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import { AlertCircle, CheckCircle2, Loader2, Store } from "lucide-react";

import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { ReportSelectDialog } from "./components/report-select-dialog";
import { CompletionChecklistStep } from "./components/completion-checklist-step";
import { StartWorkRevisionCard } from "./components/start-work-revision-card";
import {
    createInitialItemState,
    hasActualPrice,
    realisasiGrandTotal,
    realisasiNetTotal,
} from "./types";

import { submitCompletionWork } from "@/app/reports/actions/submit-completion-work";
import { fetchReportForCompletion } from "./actions";
import type { WorkableReport, ReportForCompletion } from "./queries";
import type {
    CompletionDraftData,
    CompletionItemState,
    LocalPhoto,
    MaterialStoreEntry,
} from "./types";
import { useCompletionAutosave } from "./hooks/use-completion-autosave";
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
    | { target: "startSelfie" | "startStore" | "startReceipt" }
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

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isTotalEstimationZero(report: NonNullable<ReportForCompletion>) {
    return (
        report.estimations.reduce((sum, item) => sum + item.totalPrice, 0) === 0
    );
}

function isCompletionItemComplete(state: CompletionItemState): boolean {
    return (
        state.afterPhotos.length > 0 &&
        state.realisasiEntries.length > 0 &&
        state.realisasiEntries.every(
            (entry) =>
                entry.materialName.trim().length > 0 && hasActualPrice(entry),
        )
    );
}

function ReportSummaryCard({
    report,
    itemStates,
}: {
    report: NonNullable<ReportForCompletion>;
    itemStates: Map<string, CompletionItemState>;
}) {
    const damagedBmsItemIds = report.items
        .filter(
            (item) =>
                (item.condition === "RUSAK" ||
                    item.preventiveCondition === "NOT_OK") &&
                item.handler === "BMS",
        )
        .map((item) => item.itemId);
    const totalDamaged = damagedBmsItemIds.length;
    const totalCompleted = damagedBmsItemIds.filter((id) => {
        const state = itemStates.get(id);
        return state ? isCompletionItemComplete(state) : false;
    }).length;

    return (
        <Card className="mx-auto w-full max-w-5xl py-0 md:py-6 ring-0 shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
            <CardHeader className="px-1 md:px-6 flex flex-row items-center justify-between mb-6">
                <div>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        {report.storeName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {report.reportNumber} · {report.branchName}
                    </CardDescription>
                </div>

                {totalDamaged > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                        {totalCompleted === totalDamaged ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span
                            className={
                                totalCompleted === totalDamaged
                                    ? "text-green-700 font-medium"
                                    : "text-muted-foreground"
                            }
                        >
                            {totalCompleted}/{totalDamaged} item selesai
                        </span>
                    </div>
                )}
            </CardHeader>
        </Card>
    );
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
                discountAmount:
                    typeof item.discountAmount === "number"
                        ? Math.max(0, item.discountAmount)
                        : baseState.discountAmount,
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
    const { uploadPhoto } = usePhotoUpload();

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
    const [startWorkSelfiePhotos, setStartWorkSelfiePhotos] = useState<
        LocalPhoto[]
    >([]);
    const [startWorkMaterialStorePhotos, setStartWorkMaterialStorePhotos] =
        useState<LocalPhoto[]>([]);
    const [startWorkReceiptPhotos, setStartWorkReceiptPhotos] = useState<
        LocalPhoto[]
    >([]);
    const [startWorkMaterialStores, setStartWorkMaterialStores] = useState<
        MaterialStoreEntry[]
    >([]);
    const [startWorkSkipPhotos, setStartWorkSkipPhotos] = useState(false);
    const startWorkStoreGalleryInputRef = useRef<HTMLInputElement>(null);

    // ── Camera state ─────────────────────────────────────────────────────────
    const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);
    const [startWorkPreviewUrl, setStartWorkPreviewUrl] = useState<
        string | null
    >(null);

    // ── Autosave ──────────────────────────────────────────────────────────────
    const reportNumberRef = useRef<string | null>(null);
    const autosave = useCompletionAutosave();

    // ─── Helper: build draft data from current state ─────────────────────────
    const buildDraftData = useCallback(
        (
            rn: string,
            notes: string,
            states: Map<string, CompletionItemState>,
            additionalPhotos: Array<{ id: string; previewUrl: string }>,
            additionalNote: string,
            startSelfies: LocalPhoto[],
            startStorePhotos: LocalPhoto[],
            startReceipts: LocalPhoto[],
            startStores: MaterialStoreEntry[],
            startSkipPhotos: boolean,
        ): CompletionDraftData => ({
            version: 2,
            reportNumber: rn,
            savedAt: new Date().toISOString(),
            globalNotes: notes,
            selfiePhotoIds: [],
            startWorkSelfiePhotoIds: startSelfies.map((p) => p.id),
            startWorkMaterialStorePhotoIds: startStorePhotos.map((p) => p.id),
            startWorkReceiptPhotoIds: startReceipts.map((p) => p.id),
            startWorkMaterialStores: startStores,
            startWorkSkipPhotos: startSkipPhotos,
            additionalDocumentationPhotoIds: additionalPhotos.map((p) => p.id),
            additionalDocumentationNote: additionalNote,
            itemStates: Object.fromEntries(
                [...states.entries()].map(([itemId, s]) => [
                    itemId,
                    {
                        afterPhotoIds: s.afterPhotos.map((p) => p.id),
                        realisasiEntries: s.realisasiEntries,
                        discountAmount: s.discountAmount,
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
            autosave.triggerSave(
                rn,
                buildDraftData(
                    rn,
                    notes,
                    states,
                    additionalDocumentationPhotos,
                    additionalDocumentationNote,
                    startWorkSelfiePhotos,
                    startWorkMaterialStorePhotos,
                    startWorkReceiptPhotos,
                    startWorkMaterialStores,
                    startWorkSkipPhotos,
                ),
            );
        },
        [
            autosave,
            buildDraftData,
            additionalDocumentationPhotos,
            additionalDocumentationNote,
            startWorkSelfiePhotos,
            startWorkMaterialStorePhotos,
            startWorkReceiptPhotos,
            startWorkMaterialStores,
            startWorkSkipPhotos,
        ],
    );

    useEffect(() => {
        if (!currentReport) return;
        triggerAutosave(globalNotes, itemStates);
    }, [
        currentReport,
        globalNotes,
        itemStates,
        startWorkSelfiePhotos,
        startWorkMaterialStorePhotos,
        startWorkReceiptPhotos,
        startWorkMaterialStores,
        startWorkSkipPhotos,
        triggerAutosave,
    ]);

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
                const reportAdditionalPhotoUrls = parseStringArray(
                    report.completionAdditionalPhotos,
                );
                setAdditionalDocumentationPhotos(
                    draft.additionalDocumentationPhotos.length > 0
                        ? draft.additionalDocumentationPhotos
                        : reportAdditionalPhotoUrls.map((url, idx) =>
                              toRemotePhoto(url, idx),
                          ),
                );
                setAdditionalDocumentationNote(
                    draft.additionalDocumentationNote ||
                        report.completionAdditionalNote?.trim() ||
                        "",
                );
                setStartWorkSelfiePhotos(
                    draft.startWorkSelfiePhotos.length > 0
                        ? draft.startWorkSelfiePhotos
                        : report.startSelfieUrls.map((url, idx) =>
                              toRemotePhoto(url, idx),
                          ),
                );
                setStartWorkReceiptPhotos(
                    draft.startWorkReceiptPhotos.length > 0
                        ? draft.startWorkReceiptPhotos
                        : report.startReceiptUrls.map((url, idx) =>
                              toRemotePhoto(url, idx),
                          ),
                );
                const reportStartStorePhotoUrls =
                    report.startMaterialStores.flatMap(
                        (store) => store.photoUrls ?? [],
                    );
                setStartWorkMaterialStorePhotos(
                    draft.startWorkMaterialStorePhotos.length > 0
                        ? draft.startWorkMaterialStorePhotos
                        : reportStartStorePhotoUrls.map((url, idx) =>
                              toRemotePhoto(url, idx),
                          ),
                );
                setStartWorkMaterialStores(
                    draft.startWorkMaterialStores.length > 0
                        ? draft.startWorkMaterialStores
                        : report.startMaterialStores.map((store, idx) => ({
                              id: `db-start-store-${idx}`,
                              name: store.name,
                              city: store.city,
                              photoUrls: store.photoUrls,
                          })),
                );
                setStartWorkSkipPhotos(draft.startWorkSkipPhotos);

                // Merge draft with fresh item states (in case new items were added)
                const freshStates = buildItemStates(report);
                const mergedStates = new Map(freshStates);
                for (const [itemId, draftState] of draft.itemStates) {
                    const freshState = mergedStates.get(itemId);
                    if (!freshState) continue;

                    mergedStates.set(itemId, {
                        ...draftState,
                        afterPhotos:
                            draftState.afterPhotos.length > 0
                                ? draftState.afterPhotos
                                : freshState.afterPhotos,
                        realisasiEntries:
                            draftState.realisasiEntries.length > 0
                                ? draftState.realisasiEntries
                                : freshState.realisasiEntries,
                        discountAmount:
                            draftState.discountAmount ??
                            freshState.discountAmount,
                    });
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
                setStartWorkSelfiePhotos(
                    report.startSelfieUrls.map((url, idx) =>
                        toRemotePhoto(url, idx),
                    ),
                );
                setStartWorkReceiptPhotos(
                    report.startReceiptUrls.map((url, idx) =>
                        toRemotePhoto(url, idx),
                    ),
                );
                const startStorePhotoUrls = report.startMaterialStores.flatMap(
                    (store) => store.photoUrls ?? [],
                );
                setStartWorkMaterialStorePhotos(
                    startStorePhotoUrls.map((url, idx) =>
                        toRemotePhoto(url, idx),
                    ),
                );
                setStartWorkMaterialStores(
                    report.startMaterialStores.map((store, idx) => ({
                        id: `db-start-store-${idx}`,
                        name: store.name,
                        city: store.city,
                        photoUrls: store.photoUrls,
                    })),
                );
                setStartWorkSkipPhotos(false);
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

    const handleOpenStartWorkCamera = useCallback(
        (target: "startSelfie" | "startStore" | "startReceipt") => {
            setCameraTarget({ target });
        },
        [],
    );

    const handlePhotoCaptured = useCallback(
        async (file: File) => {
            if (!cameraTarget || !currentReport) return;
            setCameraTarget(null);

            if (
                cameraTarget.target === "startSelfie" ||
                cameraTarget.target === "startStore" ||
                cameraTarget.target === "startReceipt"
            ) {
                const rn = reportNumberRef.current!;
                const photo = await autosave.addPhoto(
                    rn,
                    file,
                    cameraTarget.target,
                );
                if (cameraTarget.target === "startSelfie") {
                    setStartWorkSelfiePhotos((prev) => [...prev, photo]);
                } else if (cameraTarget.target === "startStore") {
                    setStartWorkMaterialStorePhotos((prev) => [...prev, photo]);
                } else {
                    setStartWorkReceiptPhotos((prev) => [...prev, photo]);
                    setStartWorkMaterialStores((prev) =>
                        prev.length > 0
                            ? prev
                            : [{ id: genId(), name: "", city: "" }],
                    );
                }
                triggerAutosave(globalNotes, itemStates);
                return;
            }

            if (cameraTarget.target === "additional") {
                const rn = reportNumberRef.current!;
                const photo = await autosave.addPhoto(
                    rn,
                    file,
                    `additional-doc-${Date.now()}`,
                );
                setAdditionalDocumentationPhotos((prev) => {
                    const next = [...prev, photo];
                    autosave.triggerSave(
                        rn,
                        buildDraftData(
                            rn,
                            globalNotes,
                            itemStates,
                            next,
                            additionalDocumentationNote,
                            startWorkSelfiePhotos,
                            startWorkMaterialStorePhotos,
                            startWorkReceiptPhotos,
                            startWorkMaterialStores,
                            startWorkSkipPhotos,
                        ),
                    );
                    return next;
                });
                return;
            }

            if (cameraTarget.target !== "item") return;

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
        [
            cameraTarget,
            currentReport,
            autosave,
            globalNotes,
            itemStates,
            additionalDocumentationNote,
            startWorkSelfiePhotos,
            startWorkMaterialStorePhotos,
            startWorkReceiptPhotos,
            startWorkMaterialStores,
            startWorkSkipPhotos,
            buildDraftData,
            triggerAutosave,
        ],
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

    const handleAdditionalDocumentationPhotosChange = useCallback(
        (photos: Array<{ id: string; previewUrl: string }>) => {
            setAdditionalDocumentationPhotos(photos);
            const rn = reportNumberRef.current;
            if (!rn) return;
            autosave.triggerSave(
                rn,
                buildDraftData(
                    rn,
                    globalNotes,
                    itemStates,
                    photos,
                    additionalDocumentationNote,
                    startWorkSelfiePhotos,
                    startWorkMaterialStorePhotos,
                    startWorkReceiptPhotos,
                    startWorkMaterialStores,
                    startWorkSkipPhotos,
                ),
            );
        },
        [
            autosave,
            buildDraftData,
            globalNotes,
            itemStates,
            additionalDocumentationNote,
            startWorkSelfiePhotos,
            startWorkMaterialStorePhotos,
            startWorkReceiptPhotos,
            startWorkMaterialStores,
            startWorkSkipPhotos,
        ],
    );

    const handleAdditionalDocumentationNoteChange = useCallback(
        (value: string) => {
            setAdditionalDocumentationNote(value);
            const rn = reportNumberRef.current;
            if (!rn) return;
            autosave.triggerSave(
                rn,
                buildDraftData(
                    rn,
                    globalNotes,
                    itemStates,
                    additionalDocumentationPhotos,
                    value,
                    startWorkSelfiePhotos,
                    startWorkMaterialStorePhotos,
                    startWorkReceiptPhotos,
                    startWorkMaterialStores,
                    startWorkSkipPhotos,
                ),
            );
        },
        [
            autosave,
            buildDraftData,
            globalNotes,
            itemStates,
            additionalDocumentationPhotos,
            startWorkSelfiePhotos,
            startWorkMaterialStorePhotos,
            startWorkReceiptPhotos,
            startWorkMaterialStores,
            startWorkSkipPhotos,
        ],
    );

    const handleOpenStartWorkStoreGallery = useCallback(() => {
        startWorkStoreGalleryInputRef.current?.click();
    }, []);

    const handleStartWorkStoreGalleryChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            const rn = reportNumberRef.current;
            if (!rn) return;

            files.forEach((file) => {
                void autosave
                    .addPhoto(rn, file, "startStore")
                    .then((photo) =>
                        setStartWorkMaterialStorePhotos((prev) => [
                            ...prev,
                            photo,
                        ]),
                    );
            });
            event.target.value = "";
        },
        [autosave],
    );

    const handleRemoveStartWorkPhoto = useCallback(
        (kind: "selfie" | "store" | "receipt", id: string) => {
            void autosave.removePhoto(id);
            if (kind === "selfie") {
                setStartWorkSelfiePhotos((prev) =>
                    prev.filter((photo) => photo.id !== id),
                );
            } else if (kind === "store") {
                setStartWorkMaterialStorePhotos((prev) =>
                    prev.filter((photo) => photo.id !== id),
                );
            } else {
                setStartWorkReceiptPhotos((prev) =>
                    prev.filter((photo) => photo.id !== id),
                );
            }
        },
        [autosave],
    );

    const handleAddStartWorkStore = useCallback(() => {
        setStartWorkMaterialStores((prev) => [
            ...prev,
            { id: genId(), name: "", city: "" },
        ]);
    }, []);

    const handleRemoveStartWorkStore = useCallback((id: string) => {
        setStartWorkMaterialStores((prev) =>
            prev.filter((store) => store.id !== id),
        );
    }, []);

    const handleStartWorkStoreChange = useCallback(
        (id: string, field: "name" | "city", value: string) => {
            setStartWorkMaterialStores((prev) =>
                prev.map((store) =>
                    store.id === id ? { ...store, [field]: value } : store,
                ),
            );
        },
        [],
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
        const shouldReviseStartWork =
            currentReport.status === "REVIEW_REJECTED_REVISION";

        if (shouldReviseStartWork) {
            if (startWorkSkipPhotos && !isTotalEstimationZero(currentReport)) {
                toast.error(
                    "Lewati foto mulai pekerjaan hanya untuk estimasi Rp 0",
                );
                return;
            }

            if (!startWorkSkipPhotos) {
                if (startWorkSelfiePhotos.length === 0) {
                    toast.error("Foto selfie mulai pekerjaan wajib diisi");
                    return;
                }
                if (startWorkMaterialStorePhotos.length === 0) {
                    toast.error(
                        "Foto toko material mulai pekerjaan wajib diisi",
                    );
                    return;
                }
                if (startWorkReceiptPhotos.length === 0) {
                    toast.error("Foto nota/struk mulai pekerjaan wajib diisi");
                    return;
                }
                if (
                    startWorkMaterialStores.length === 0 ||
                    startWorkMaterialStores.some(
                        (store) => !store.name.trim() || !store.city.trim(),
                    )
                ) {
                    toast.error(
                        "Semua toko material mulai pekerjaan harus memiliki nama dan alamat",
                    );
                    return;
                }
            }
        }

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
                    (e) => !e.materialName.trim() || !hasActualPrice(e),
                )
            ) {
                toast.error(
                    "Semua baris realisasi harus memiliki nama barang dan harga aktual/real",
                    { description: `Item: ${item.itemName}` },
                );
                return;
            }
            if (
                state.realisasiEntries.some(
                    (e) => e.price !== null && e.price < 0,
                )
            ) {
                toast.error("Harga aktual/real tidak boleh minus", {
                    description: `Item: ${item.itemName}`,
                });
                return;
            }
            if (state.discountAmount < 0) {
                toast.error("Potongan harga tidak boleh minus", {
                    description: `Item: ${item.itemName}`,
                });
                return;
            }
            const itemSubtotal = realisasiGrandTotal(state.realisasiEntries);
            if (state.discountAmount > itemSubtotal) {
                toast.error(
                    "Potongan harga tidak boleh lebih besar dari total item",
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
            const allCompletionFileIds: string[] = [];
            const uploadPhotoSet = async (
                photos: LocalPhoto[],
                errorMessage: string,
            ) => {
                const urls: string[] = [];
                const fileIds: string[] = [];

                for (const photo of photos) {
                    if (photo.id.startsWith("remote-") && photo.previewUrl) {
                        urls.push(photo.previewUrl);
                        continue;
                    }

                    const file = await autosave.getPhotoFile(photo.id);
                    if (!file) {
                        toast.error(errorMessage, { id: loadingId });
                        return null;
                    }

                    const uploadResult = await uploadPhoto(file);
                    if (!uploadResult) {
                        toast.error(errorMessage, { id: loadingId });
                        return null;
                    }

                    urls.push(uploadResult.url);
                    fileIds.push(uploadResult.fileId);
                }

                return { urls, fileIds };
            };

            const startWorkRevision = shouldReviseStartWork
                ? await (async () => {
                      const selfie = await uploadPhotoSet(
                          startWorkSelfiePhotos,
                          "Gagal mengunggah foto selfie mulai pekerjaan",
                      );
                      if (!selfie) return null;

                      const receipts = await uploadPhotoSet(
                          startWorkReceiptPhotos,
                          "Gagal mengunggah foto nota mulai pekerjaan",
                      );
                      if (!receipts) return null;

                      const stores = await uploadPhotoSet(
                          startWorkMaterialStorePhotos,
                          "Gagal mengunggah foto toko material mulai pekerjaan",
                      );
                      if (!stores) return null;

                      return {
                          selfieUrls: selfie.urls,
                          selfieFileIds: selfie.fileIds,
                          receiptUrls: receipts.urls,
                          receiptFileIds: receipts.fileIds,
                          materialStores: startWorkMaterialStores.map(
                              (store, index) => ({
                                  name: store.name.trim(),
                                  city: store.city.trim(),
                                  ...(index === 0 && stores.urls.length > 0
                                      ? { photoUrls: stores.urls }
                                      : {}),
                              }),
                          ),
                          materialStorePhotoFileIds: stores.fileIds,
                          skipPhotos: startWorkSkipPhotos,
                      };
                  })()
                : undefined;

            if (shouldReviseStartWork && !startWorkRevision) return;

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
                    const result = await uploadPhoto(file);
                    if (!result) {
                        toast.error("Gagal mengunggah foto sesudah", {
                            id: loadingId,
                        });
                        return;
                    }
                    afterImages.push(result.url);
                    allCompletionFileIds.push(result.fileId);
                }

                completionItems.push({
                    itemId: item.itemId,
                    afterImages,
                    realisasiItems: state.realisasiEntries.map((e) => ({
                        materialName: e.materialName,
                        quantity: e.quantity,
                        unit: e.unit,
                        price: e.price ?? 0,
                        totalPrice: e.quantity * (e.price ?? 0),
                    })),
                    discountAmount: state.discountAmount,
                    actualCost: realisasiNetTotal(
                        state.realisasiEntries,
                        state.discountAmount,
                    ),
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
                const result = await uploadPhoto(file);
                if (!result) {
                    toast.error("Gagal mengunggah dokumentasi tambahan", {
                        id: loadingId,
                    });
                    return;
                }
                additionalPhotoUrls.push(result.url);
                allCompletionFileIds.push(result.fileId);
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
                allCompletionFileIds,
                startWorkRevision ?? undefined,
            );

            if (result.error) {
                toast.error("Gagal mengajukan penyelesaian", {
                    id: loadingId,
                    description: result.error,
                });
            } else {
                await autosave.clearDraft(rn);
                toast.success("Penyelesaian berhasil dikirim!", {
                    id: loadingId,
                    description: "Menunggu review BMC.",
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
        startWorkSelfiePhotos,
        startWorkMaterialStorePhotos,
        startWorkReceiptPhotos,
        startWorkMaterialStores,
        startWorkSkipPhotos,
        autosave,
        uploadPhoto,
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
                    <ReportSummaryCard
                        report={currentReport}
                        itemStates={itemStates}
                    />
                    {startWorkPreviewUrl && (
                        <div
                            className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4"
                            onClick={() => setStartWorkPreviewUrl(null)}
                        >
                            <div
                                className="relative max-h-[90vh] w-full max-w-4xl"
                                onClick={(event) => event.stopPropagation()}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={startWorkPreviewUrl}
                                    alt="Preview foto mulai pekerjaan"
                                    className="max-h-[85vh] h-full w-full rounded-lg object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={() => setStartWorkPreviewUrl(null)}
                                    className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-black shadow-lg transition-colors hover:bg-gray-100"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                    {currentReport.status === "REVIEW_REJECTED_REVISION" && (
                        <>
                            <input
                                ref={startWorkStoreGalleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleStartWorkStoreGalleryChange}
                            />
                            <StartWorkRevisionCard
                                isZeroCost={isTotalEstimationZero(
                                    currentReport,
                                )}
                                skipPhotos={startWorkSkipPhotos}
                                onSkipPhotosChange={setStartWorkSkipPhotos}
                                selfiePhotos={startWorkSelfiePhotos}
                                materialStorePhotos={
                                    startWorkMaterialStorePhotos
                                }
                                receiptPhotos={startWorkReceiptPhotos}
                                materialStores={startWorkMaterialStores}
                                onOpenCamera={handleOpenStartWorkCamera}
                                onOpenStoreGallery={
                                    handleOpenStartWorkStoreGallery
                                }
                                onRemoveSelfie={(id) =>
                                    handleRemoveStartWorkPhoto("selfie", id)
                                }
                                onRemoveStorePhoto={(id) =>
                                    handleRemoveStartWorkPhoto("store", id)
                                }
                                onRemoveReceipt={(id) =>
                                    handleRemoveStartWorkPhoto("receipt", id)
                                }
                                onAddStore={handleAddStartWorkStore}
                                onRemoveStore={handleRemoveStartWorkStore}
                                onStoreChange={handleStartWorkStoreChange}
                                onPreview={setStartWorkPreviewUrl}
                            />
                        </>
                    )}
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
                            handleAdditionalDocumentationPhotosChange
                        }
                        additionalDocumentationNote={
                            additionalDocumentationNote
                        }
                        onAdditionalDocumentationNoteChange={
                            handleAdditionalDocumentationNoteChange
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
