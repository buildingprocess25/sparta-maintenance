"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
    submitCompletionWork,
    type CompletionItemInput,
    type StartWorkRevisionInput,
} from "@/app/reports/actions/submit-completion-work";
import { getCompletionEvidenceErrors, type CompletionEvidenceError } from "@/lib/completion-evidence";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import { usePhotoUpload } from "@/lib/hooks/use-photo-upload";
import {
    realisasiNetTotal,
    type CompletionDraftData,
    type CompletionItemState,
    type LocalPhoto,
    type MaterialStoreEntry,
} from "./types";
import { useCompletionAutosave } from "./hooks/use-completion-autosave";
import {
    buildItemStates,
    genId,
    getDamagedBmsItems,
    getEstimationMap,
    getTotalEstimation,
    isCompletionItemComplete,
    toRemotePhoto,
    type CompletionReport,
} from "./completion-utils";

type CameraTarget =
    | { target: "item"; itemId: string }
    | { target: "additional" }
    | { target: "startSelfie" | "startStore" | "startReceipt" }
    | null;

export function useCompletionWorkForm(report: CompletionReport) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { uploadPhoto } = usePhotoUpload();
    const autosave = useCompletionAutosave();
    const reportNumber = report.reportNumber;
    const totalEstimation = getTotalEstimation(report);
    const shouldReviseStartWork =
        report.status === "REVIEW_REJECTED_REVISION";
    const isZeroCost = totalEstimation === 0;

    const [isRestoringDraft, setIsRestoringDraft] = useState(true);
    const [itemStates, setItemStates] = useState(() =>
        buildItemStates(report),
    );
    const [globalNotes, setGlobalNotes] = useState(
        report.completionNotes?.trim() || "",
    );
    const [additionalDocumentationPhotos, setAdditionalDocumentationPhotos] =
        useState<LocalPhoto[]>(() =>
            report.completionAdditionalPhotos.map((url, idx) =>
                toRemotePhoto(url, idx),
            ),
        );
    const [additionalDocumentationNote, setAdditionalDocumentationNote] =
        useState(report.completionAdditionalNote?.trim() || "");
    const [startWorkSelfiePhotos, setStartWorkSelfiePhotos] = useState<
        LocalPhoto[]
    >(() =>
        report.startSelfieUrls.map((url, idx) => toRemotePhoto(url, idx)),
    );
    const [startWorkMaterialStorePhotos, setStartWorkMaterialStorePhotos] =
        useState<LocalPhoto[]>(() =>
            report.startMaterialStores
                .flatMap((store) => store.photoUrls ?? [])
                .map((url, idx) => toRemotePhoto(url, idx)),
        );
    const [startWorkReceiptPhotos, setStartWorkReceiptPhotos] = useState<
        LocalPhoto[]
    >(() =>
        report.startReceiptUrls.map((url, idx) => toRemotePhoto(url, idx)),
    );
    const [startWorkMaterialStores, setStartWorkMaterialStores] = useState<
        MaterialStoreEntry[]
    >(() =>
        report.startMaterialStores.map((store, idx) => ({
            id: `db-start-store-${idx}`,
            name: store.name,
            city: store.city,
            photoUrls: store.photoUrls,
        })),
    );
    const [startWorkSkipPhotos, setStartWorkSkipPhotos] = useState(false);
    const [cameraTarget, setCameraTarget] = useState<CameraTarget>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const startWorkStoreGalleryInputRef = useRef<HTMLInputElement>(null);
    const closePreview = useHistoryBackClose(!!previewUrl, () =>
        setPreviewUrl(null),
    );

    const damagedItems = useMemo(() => getDamagedBmsItems(report), [report]);
    const estimationMap = useMemo(() => getEstimationMap(report), [report]);
    const completedCount = useMemo(
        () =>
            damagedItems.filter((item) => {
                const state = itemStates.get(item.itemId);
                return state ? isCompletionItemComplete(state) : false;
            }).length,
        [damagedItems, itemStates],
    );
    const grandTotal = useMemo(
        () =>
            damagedItems.reduce((sum, item) => {
                const state = itemStates.get(item.itemId);
                if (!state) return sum;
                return (
                    sum +
                    realisasiNetTotal(
                        state.realisasiEntries,
                        state.discountAmount,
                    )
                );
            }, 0),
        [damagedItems, itemStates],
    );

    const buildDraftData = useCallback(
        (): CompletionDraftData => ({
            version: 2,
            reportNumber,
            savedAt: new Date().toISOString(),
            globalNotes,
            selfiePhotoIds: [],
            startWorkSelfiePhotoIds: startWorkSelfiePhotos.map(
                (photo) => photo.id,
            ),
            startWorkMaterialStorePhotoIds: startWorkMaterialStorePhotos.map(
                (photo) => photo.id,
            ),
            startWorkReceiptPhotoIds: startWorkReceiptPhotos.map(
                (photo) => photo.id,
            ),
            startWorkMaterialStores,
            startWorkSkipPhotos,
            additionalDocumentationPhotoIds: additionalDocumentationPhotos.map(
                (photo) => photo.id,
            ),
            additionalDocumentationNote,
            itemStates: Object.fromEntries(
                [...itemStates.entries()].map(([itemId, state]) => [
                    itemId,
                    {
                        afterPhotoIds: state.afterPhotos.map(
                            (photo) => photo.id,
                        ),
                        realisasiEntries: state.realisasiEntries,
                        discountAmount: state.discountAmount,
                        materialStores: state.materialStores,
                        receiptPhotoIds: [],
                        notes: state.notes,
                    },
                ]),
            ),
        }),
        [
            additionalDocumentationNote,
            additionalDocumentationPhotos,
            globalNotes,
            itemStates,
            reportNumber,
            startWorkMaterialStorePhotos,
            startWorkMaterialStores,
            startWorkReceiptPhotos,
            startWorkSelfiePhotos,
            startWorkSkipPhotos,
        ],
    );

    useEffect(() => {
        let mounted = true;

        autosave
            .restoreDraft(reportNumber)
            .then((draft) => {
                if (!mounted || !draft) return;

                setGlobalNotes(draft.globalNotes);
                setAdditionalDocumentationPhotos(
                    draft.additionalDocumentationPhotos.length > 0
                        ? draft.additionalDocumentationPhotos
                        : report.completionAdditionalPhotos.map((url, idx) =>
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
            })
            .finally(() => {
                if (mounted) setIsRestoringDraft(false);
            });

        return () => {
            mounted = false;
        };
    }, [autosave, report, reportNumber]);

    useEffect(() => {
        if (isRestoringDraft) return;
        autosave.triggerSave(reportNumber, buildDraftData());
    }, [autosave, buildDraftData, isRestoringDraft, reportNumber]);

    const updateItemState = useCallback(
        (itemId: string, patch: Partial<CompletionItemState>) => {
            setItemStates((prev) => {
                const current = prev.get(itemId);
                if (!current) return prev;

                const next = new Map(prev);
                next.set(itemId, { ...current, ...patch });
                return next;
            });
        },
        [],
    );

    const handlePhotoCaptured = useCallback(
        async (file: File) => {
            if (!cameraTarget) return;
            setCameraTarget(null);

            if (cameraTarget.target === "additional") {
                const photo = await autosave.addPhoto(
                    reportNumber,
                    file,
                    `additional-doc-${Date.now()}`,
                );
                setAdditionalDocumentationPhotos((prev) => [...prev, photo]);
                return;
            }

            if (
                cameraTarget.target === "startSelfie" ||
                cameraTarget.target === "startStore" ||
                cameraTarget.target === "startReceipt"
            ) {
                const photo = await autosave.addPhoto(
                    reportNumber,
                    file,
                    cameraTarget.target,
                );

                if (cameraTarget.target === "startSelfie") {
                    setStartWorkSelfiePhotos((prev) => [...prev, photo]);
                    return;
                }

                if (cameraTarget.target === "startStore") {
                    setStartWorkMaterialStorePhotos((prev) => [
                        ...prev,
                        photo,
                    ]);
                    setStartWorkMaterialStores((prev) =>
                        prev.length > 0
                            ? prev
                            : [{ id: genId(), name: "", city: "" }],
                    );
                    return;
                }

                setStartWorkReceiptPhotos((prev) => [...prev, photo]);
                setStartWorkMaterialStores((prev) =>
                    prev.length > 0
                        ? prev
                        : [{ id: genId(), name: "", city: "" }],
                );
                return;
            }

            if (cameraTarget.target !== "item") return;

            const itemId = cameraTarget.itemId;
            const photo = await autosave.addPhoto(
                reportNumber,
                file,
                `after-${itemId}`,
            );
            setItemStates((prev) => {
                const current = prev.get(itemId);
                if (!current) return prev;

                const next = new Map(prev);
                next.set(itemId, {
                    ...current,
                    afterPhotos: [...current.afterPhotos, photo],
                });
                return next;
            });
        },
        [autosave, cameraTarget, reportNumber],
    );

    const handleRemovePhoto = useCallback(
        (id: string, updater: () => void) => {
            void autosave.removePhoto(id);
            updater();
        },
        [autosave],
    );

    const handleStartWorkStoreGalleryChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            files.forEach((file) => {
                void autosave
                    .addPhoto(reportNumber, file, "startStore")
                    .then((photo) => {
                        setStartWorkMaterialStorePhotos((prev) => [
                            ...prev,
                            photo,
                        ]);
                        setStartWorkMaterialStores((prev) =>
                            prev.length > 0
                                ? prev
                                : [{ id: genId(), name: "", city: "" }],
                        );
                    });
            });
            event.target.value = "";
        },
        [autosave, reportNumber],
    );

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

    const validationErrors = useMemo(() => {
        const errs: { id: string; message: string; description?: string }[] = [];

        const evidenceErrors = getCompletionEvidenceErrors(
            damagedItems.map((item) => {
                const state = itemStates.get(item.itemId);
                return {
                    itemId: item.itemId,
                    itemName: item.itemName,
                    afterPhotoCount: state?.afterPhotos.length ?? 0,
                    realisasiEntries: state?.realisasiEntries ?? [],
                    discountAmount: state?.discountAmount ?? 0,
                };
            }),
        );

        evidenceErrors.forEach(e => errs.push({
            id: `completion-item-${e.itemId}`,
            message: e.message,
            description: e.description
        }));

        if (shouldReviseStartWork) {
            if (startWorkSkipPhotos && !isZeroCost) {
                errs.push({
                    id: "start-work",
                    message: "Lewati foto mulai pekerjaan hanya untuk estimasi Rp 0"
                });
            } else if (!startWorkSkipPhotos) {
                if (startWorkSelfiePhotos.length === 0) {
                    errs.push({ id: "start-work", message: "Foto selfie mulai pekerjaan wajib diisi" });
                }
                if (startWorkMaterialStorePhotos.length === 0) {
                    errs.push({ id: "start-work", message: "Foto toko material mulai pekerjaan wajib diisi" });
                }
                if (startWorkReceiptPhotos.length === 0) {
                    errs.push({ id: "start-work", message: "Foto nota/struk mulai pekerjaan wajib diisi" });
                }
                if (
                    startWorkMaterialStores.length === 0 ||
                    startWorkMaterialStores.some(
                        (store) => !store.name.trim() || !store.city.trim(),
                    )
                ) {
                    errs.push({ id: "start-work", message: "Semua toko material mulai pekerjaan harus memiliki nama dan alamat" });
                }
            }
        }

        return errs;
    }, [
        damagedItems,
        itemStates,
        shouldReviseStartWork,
        startWorkSkipPhotos,
        isZeroCost,
        startWorkSelfiePhotos.length,
        startWorkMaterialStorePhotos.length,
        startWorkReceiptPhotos.length,
        startWorkMaterialStores
    ]);

    const handleSubmit = useCallback(() => {
        if (validationErrors.length > 0) {
            return;
        }

        startTransition(async () => {
            const loadingId = toast.loading(
                "Mengunggah foto dan mengirim hasil pekerjaan...",
            );

            const uploadPhotos = async (
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

                    const result = await uploadPhoto(file);
                    if (!result) {
                        toast.error(errorMessage, { id: loadingId });
                        return null;
                    }

                    urls.push(result.url);
                    fileIds.push(result.fileId);
                }

                return { urls, fileIds };
            };

            const startWorkRevision: StartWorkRevisionInput | undefined =
                shouldReviseStartWork
                    ? await (async () => {
                          if (startWorkSkipPhotos) {
                              return {
                                  selfieUrls: [],
                                  selfieFileIds: [],
                                  receiptUrls: [],
                                  receiptFileIds: [],
                                  materialStores: [],
                                  materialStorePhotoFileIds: [],
                                  skipPhotos: true,
                              };
                          }

                          const selfie = await uploadPhotos(
                              startWorkSelfiePhotos,
                              "Gagal mengunggah foto selfie mulai pekerjaan",
                          );
                          if (!selfie) return undefined;

                          const receipts = await uploadPhotos(
                              startWorkReceiptPhotos,
                              "Gagal mengunggah foto nota mulai pekerjaan",
                          );
                          if (!receipts) return undefined;

                          const stores = await uploadPhotos(
                              startWorkMaterialStorePhotos,
                              "Gagal mengunggah foto toko material mulai pekerjaan",
                          );
                          if (!stores) return undefined;

                          return {
                              selfieUrls: selfie.urls,
                              selfieFileIds: selfie.fileIds,
                              receiptUrls: receipts.urls,
                              receiptFileIds: receipts.fileIds,
                              materialStores: startWorkMaterialStores.map(
                                  (store, index) => ({
                                      name: store.name.trim(),
                                      city: store.city.trim(),
                                      ...(index === 0 &&
                                      stores.urls.length > 0
                                          ? { photoUrls: stores.urls }
                                          : {}),
                                  }),
                              ),
                              materialStorePhotoFileIds: stores.fileIds,
                              skipPhotos: false,
                          };
                      })()
                    : undefined;

            if (shouldReviseStartWork && !startWorkRevision) return;

            const completionItems: CompletionItemInput[] = [];
            const completionFileIds: string[] = [];

            for (const item of damagedItems) {
                const state = itemStates.get(item.itemId);
                if (!state) continue;

                const afterPhotos = await uploadPhotos(
                    state.afterPhotos,
                    `Gagal mengunggah foto sesudah untuk item ${item.itemName}`,
                );
                if (!afterPhotos) return;

                completionFileIds.push(...afterPhotos.fileIds);
                completionItems.push({
                    itemId: item.itemId,
                    afterImages: afterPhotos.urls,
                    realisasiItems: state.realisasiEntries.map((entry) => {
                        const qty = typeof entry.quantity === "number" ? entry.quantity : 0;
                        return {
                            materialName: entry.materialName.trim(),
                            quantity: qty,
                            unit: entry.unit,
                            price: entry.price ?? 0,
                            totalPrice: qty * (entry.price ?? 0),
                        };
                    }),
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

            const additionalPhotos = await uploadPhotos(
                additionalDocumentationPhotos,
                "Gagal mengunggah dokumentasi tambahan",
            );
            if (!additionalPhotos) return;
            completionFileIds.push(...additionalPhotos.fileIds);

            const result = await submitCompletionWork(
                reportNumber,
                completionItems,
                [],
                {
                    photos: additionalPhotos.urls,
                    note: additionalDocumentationNote.trim() || undefined,
                },
                globalNotes.trim() || undefined,
                completionFileIds,
                startWorkRevision,
            );

            if (result.error) {
                toast.error("Gagal mengirim hasil pekerjaan", {
                    id: loadingId,
                    description: result.error,
                });
                return;
            }

            await autosave.clearDraft(reportNumber);
            toast.success("Hasil pekerjaan berhasil dikirim", {
                id: loadingId,
                description: "Menunggu review BMC.",
            });
            router.push(`/reports/${reportNumber}`);
        });
    }, [
        additionalDocumentationNote,
        additionalDocumentationPhotos,
        autosave,
        damagedItems,
        globalNotes,
        isZeroCost,
        itemStates,
        reportNumber,
        router,
        shouldReviseStartWork,
        startTransition,
        startWorkMaterialStorePhotos,
        startWorkMaterialStores,
        startWorkReceiptPhotos,
        startWorkSelfiePhotos,
        startWorkSkipPhotos,
        uploadPhoto,
    ]);

    return {
        additionalDocumentationNote,
        additionalDocumentationPhotos,
        cameraTarget,
        closePreview,
        completedCount,
        damagedItems,
        estimationMap,
        globalNotes,
        grandTotal,
        handlePhotoCaptured,
        handleRemovePhoto,
        handleStartWorkStoreChange,
        handleStartWorkStoreGalleryChange,
        handleSubmit,
        validationErrors,
        isPending,
        isRestoringDraft,
        isZeroCost,
        itemStates,
        previewUrl,
        reportNumber,
        setAdditionalDocumentationNote,
        setAdditionalDocumentationPhotos,
        setCameraTarget,
        setGlobalNotes,
        setPreviewUrl,
        setStartWorkMaterialStores,
        setStartWorkMaterialStorePhotos,
        setStartWorkReceiptPhotos,
        setStartWorkSelfiePhotos,
        setStartWorkSkipPhotos,
        shouldReviseStartWork,
        startWorkMaterialStorePhotos,
        startWorkMaterialStores,
        startWorkReceiptPhotos,
        startWorkSelfiePhotos,
        startWorkSkipPhotos,
        startWorkStoreGalleryInputRef,
        totalEstimation,
        updateItemState,
    };
}
