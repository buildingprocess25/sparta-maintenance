"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
    discardDriveDraftReport,
    discardLocalDraftFiles,
} from "@/app/reports/actions";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { resolvePhotoUrl } from "@/lib/storage/photo-url";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import { loadDraftPhoto, clearDraftPhotos } from "./draft-photo-storage";
import { serializeChecklistItems } from "./draft-data";
import type {
    SerializedDraft,
    StoreOption,
    BmsItemEntry,
    BmsItemGroup,
} from "../components/types";
import type { DraftData } from "@/app/reports/actions";

const LOCAL_STORAGE_KEY_DRAFT = "sparta_bms_draft";

/**
 * Membaca draftCreatedAt dari localStorage jika sudah ada.
 * Jika belum ada (draft baru / browser baru), mengembalikan waktu sekarang.
 * Nilai ini disertakan di setiap autosave, tapi karena selalu dibaca dari
 * localStorage yang sudah ada, nilainya tidak pernah berubah setelah dibuat.
 */
function getOrSetDraftCreatedAt(): string {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DRAFT);
        if (raw) {
            const parsed = JSON.parse(raw) as { data?: { draftCreatedAt?: string } };
            const existing = parsed.data?.draftCreatedAt;
            if (existing && typeof existing === "string") {
                return existing;
            }
        }
    } catch {
        // localStorage tidak bisa diakses — fallback aman
    }
    return new Date().toISOString();
}

type UseDraftParams = {
    existingDraft?: SerializedDraft | null;
    stores: StoreOption[];
    checklist: Map<string, ChecklistItem>;
    setChecklist: React.Dispatch<
        React.SetStateAction<Map<string, ChecklistItem>>
    >;
    setOpenCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
    bmsItems: Map<string, BmsItemGroup>;
    setBmsItems: React.Dispatch<
        React.SetStateAction<Map<string, BmsItemGroup>>
    >;
    selectedStoreCode: string;
    store: string;
    userBranchName: string;
    activeCategories: ChecklistCategory[];
    grandTotalBms: number;
    isSubmitting: boolean;
    handleStoreChange: (storeCode: string) => Promise<void>;
    /** Skip the draft dialog and auto-restore the existingDraft on mount (used by edit mode). */
    autoRestore?: boolean;
    /** Disable the debounced auto-save to the draft table (used by edit mode). */
    disableAutoSave?: boolean;
};

export function useDraft({
    existingDraft,
    stores,
    checklist,
    setChecklist,
    setOpenCategories,
    bmsItems,
    setBmsItems,
    selectedStoreCode,
    store,
    userBranchName,
    activeCategories,
    grandTotalBms,
    isSubmitting,
    handleStoreChange,
    autoRestore = false,
    disableAutoSave = false,
}: UseDraftParams) {
    const LOCAL_STORAGE_KEY = "sparta_bms_draft";
    const [draftReportId, setDraftReportId] = useState<string | null>(
        existingDraft?.reportNumber || null,
    );
    // Stored alongside the DraftData to provide a human-readable saved timestamp
    const [localDraftData, setLocalDraftData] = useState<
        (DraftData & { savedAt?: string }) | null
    >(null);

    useEffect(() => {
        if (!autoRestore) {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                try {
                    const wrapper = JSON.parse(saved) as {
                        data: DraftData;
                        savedAt?: string;
                    };
                    // Support both old flat format and new {data, savedAt} format
                    const parsed: DraftData & { savedAt?: string } =
                        wrapper.data
                            ? { ...wrapper.data, savedAt: wrapper.savedAt }
                            : (wrapper as unknown as DraftData & {
                                  savedAt?: string;
                              });
                    if (
                        parsed &&
                        (parsed.checklistItems?.length > 0 || parsed.storeCode)
                    ) {
                        setLocalDraftData(parsed);
                    }
                } catch {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                }
            }
        }
    }, [autoRestore]);

    // In autoRestore mode (edit page), skip the dialog and restore inline on mount.
    const [showDraftDialog, setShowDraftDialog] = useState(false);

    useEffect(() => {
        if (!autoRestore) {
            setShowDraftDialog(!!localDraftData);
        }
    }, [localDraftData, autoRestore]);

    const [isRestoringDraft, setIsRestoringDraft] = useState(false);
    const [isDeletingDraft, setIsDeletingDraft] = useState(false);
    // Guard against double-invoke (React StrictMode / re-renders).
    const hasAutoRestoredRef = useRef(false);

    const handleContinueDraft = useCallback(
        async (opts?: { loading?: string; success?: string }) => {
            const sourceDraft = autoRestore ? existingDraft : localDraftData;
            if (!sourceDraft) return;

            setIsRestoringDraft(true);
            const loadingToastId = opts?.loading
                ? toast.loading(opts.loading)
                : undefined;
            try {
                if (sourceDraft.storeCode) {
                    const s = stores.find(
                        (st) => st.code === sourceDraft.storeCode,
                    );
                    if (s) {
                        await handleStoreChange(s.code);
                    }
                }
                if (!autoRestore && localDraftData?.draftReportNumber) {
                    setDraftReportId(localDraftData.draftReportNumber);
                }

                const fetchPhotoFromUrl = async (
                    url?: string | null,
                    name?: string,
                ): Promise<File | undefined> => {
                    if (
                        !url ||
                        (!url.startsWith("data:image") &&
                            !url.startsWith("http") &&
                            !url.startsWith("/")) ||
                        url.startsWith("blob:")
                    )
                        return undefined;
                    try {
                        const res = await fetch(
                            url.startsWith("http") ? resolvePhotoUrl(url) : url,
                        );
                        if (!res.ok) return undefined;
                        const blob = await res.blob();
                        return new File([blob], `${name || "photo"}.jpg`, {
                            type: blob.type || "image/jpeg",
                        });
                    } catch (e) {
                        console.error("Gagal restore file dari draft", e);
                        return undefined;
                    }
                };

                const fetchPhotoFromDraft = async (
                    itemId: string,
                    url?: string | null,
                    name?: string,
                ): Promise<File | undefined> => {
                    try {
                        const cached = await loadDraftPhoto(itemId);
                        if (cached) return cached;
                    } catch (e) {
                        console.warn("Gagal ambil foto dari draft", e);
                    }
                    return fetchPhotoFromUrl(url, name);
                };

                const restored = new Map<string, ChecklistItem>();
                const restoredBms = new Map<string, BmsItemGroup>();

                if (autoRestore && existingDraft) {
                    // Restore from Database Format (SerializedDraft)
                    const restoredFiles = await Promise.all(
                        existingDraft.items.map((it) =>
                            fetchPhotoFromUrl(
                                it.photoUrl || it.images?.[0],
                                it.itemName,
                            ),
                        ),
                    );

                    existingDraft.items.forEach((item, i) => {
                        const photoUrl = item.photoUrl || item.images?.[0];
                        // Preventive items are stored with preventiveCondition: "OK"/"NOT_OK"/"TIDAK_ADA"
                        // Map back to local condition values used by the form.
                        let restoredCondition: ChecklistCondition = "";
                        if (item.preventiveCondition === "OK") {
                            restoredCondition = "baik";
                        } else if (item.preventiveCondition === "NOT_OK") {
                            restoredCondition = "rusak";
                        } else if (item.preventiveCondition === "TIDAK_ADA") {
                            restoredCondition = "tidak_ada";
                        } else if (item.condition === "TIDAK_ADA") {
                            restoredCondition = "tidak_ada";
                        } else if (item.condition) {
                            restoredCondition =
                                item.condition.toLowerCase() as ChecklistCondition;
                        }
                        restored.set(item.itemId, {
                            id: item.itemId,
                            name: item.itemName,
                            condition: restoredCondition,
                            handler:
                                item.handler === "BMS"
                                    ? "BMS"
                                    : item.handler === "REKANAN" ||
                                        item.handler === "Rekanan"
                                      ? "Rekanan"
                                      : "",
                            photoUrl: photoUrl || undefined,
                            photo: restoredFiles[i],
                            notes: item.notes || undefined,
                            ahoTicketNumber: item.ahoTicketNumber || undefined,
                        });
                    });

                    if (existingDraft.estimations?.length > 0) {
                        for (const est of existingDraft.estimations) {
                            const checklistItem = restored.get(est.itemId);
                            if (!checklistItem) continue;

                            let categoryTitle = "";
                            for (const cat of checklistCategories) {
                                if (
                                    cat.items.some((i) => i.id === est.itemId)
                                ) {
                                    categoryTitle = cat.title;
                                    break;
                                }
                            }

                            const existing = restoredBms.get(est.itemId);
                            const entry: BmsItemEntry = {
                                id: `entry_${Date.now()}_${Math.random()}`,
                                categoryId: "",
                                categoryTitle,
                                itemName: est.materialName,
                                quantity: est.quantity,
                                unit: est.unit,
                                price: est.price,
                                total: est.totalPrice,
                            };

                            if (existing) {
                                existing.entries.push(entry);
                            } else {
                                restoredBms.set(est.itemId, {
                                    checklistItem,
                                    categoryTitle,
                                    entries: [entry],
                                });
                            }
                        }
                    }
                } else if (!autoRestore && localDraftData) {
                    // Restore from LocalStorage Format (DraftData)
                    const restoredFiles = await Promise.all(
                        localDraftData.checklistItems.map((it) =>
                            fetchPhotoFromDraft(
                                it.itemId,
                                it.photoUrl,
                                it.itemName,
                            ),
                        ),
                    );

                    localDraftData.checklistItems.forEach((item, i) => {
                        let restoredCondition: ChecklistCondition = "";
                        if (item.preventiveCondition === "OK") {
                            restoredCondition = "baik";
                        } else if (item.preventiveCondition === "NOT_OK") {
                            restoredCondition = "rusak";
                        } else if (item.preventiveCondition === "TIDAK_ADA") {
                            restoredCondition = "tidak_ada";
                        } else if (item.condition === "TIDAK_ADA") {
                            restoredCondition = "tidak_ada";
                        } else if (item.condition) {
                            restoredCondition =
                                item.condition.toLowerCase() as ChecklistCondition;
                        }
                        restored.set(item.itemId, {
                            id: item.itemId,
                            name: item.itemName,
                            condition: restoredCondition,
                            handler:
                                item.handler === "BMS"
                                    ? "BMS"
                                    : item.handler === "REKANAN"
                                      ? "Rekanan"
                                      : "",
                            photoUrl: item.photoUrl || undefined,
                            photoKey: item.photoKey || undefined,
                            photo: restoredFiles[i],
                            notes: item.notes || undefined,
                            ahoTicketNumber:
                                item.ahoTicketNumber || undefined,
                        });
                    });

                    if (localDraftData.bmsEstimations) {
                        for (const [itemId, entries] of Object.entries(
                            localDraftData.bmsEstimations,
                        )) {
                            const checklistItem = restored.get(itemId);
                            if (!checklistItem) continue;

                            let categoryTitle = "";
                            for (const cat of checklistCategories) {
                                if (cat.items.some((i) => i.id === itemId)) {
                                    categoryTitle = cat.title;
                                    break;
                                }
                            }

                            const builtEntries: BmsItemEntry[] = entries.map(
                                (est) => ({
                                    id: `entry_${Date.now()}_${Math.random()}`,
                                    categoryId: "",
                                    categoryTitle,
                                    itemName: est.itemName,
                                    quantity: est.quantity,
                                    unit: est.unit,
                                    price: est.price,
                                    total: est.totalPrice,
                                }),
                            );

                            restoredBms.set(itemId, {
                                checklistItem,
                                categoryTitle,
                                entries: builtEntries,
                            });
                        }
                    }
                }

                setChecklist(restored);
                setBmsItems(restoredBms);
                setOpenCategories(getCategoryIdsForItems(restored));

                setShowDraftDialog(false);
                if (loadingToastId !== undefined) toast.dismiss(loadingToastId);
                toast.success(opts?.success ?? "Draft dilanjutkan");
            } finally {
                setIsRestoringDraft(false);
            }
        },
        [
            autoRestore,
            existingDraft,
            localDraftData,
            stores,
            setChecklist,
            setOpenCategories,
            setBmsItems,
            handleStoreChange,
            setDraftReportId,
        ],
    );

    const handleCreateNew = useCallback(async () => {
        setIsDeletingDraft(true);
        try {
            if (localDraftData) {
                // Collect uploadthing keys from draft to delete them
                const fileKeys = localDraftData.checklistItems
                    .map((it) => it.photoKey)
                    .filter(Boolean) as string[];

                if (fileKeys.length > 0) {
                    await discardLocalDraftFiles(fileKeys);
                }
                if (localDraftData.draftReportNumber) {
                    await discardDriveDraftReport(
                        localDraftData.draftReportNumber,
                    );
                    setDraftReportId(null);
                }
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                await clearDraftPhotos().catch((error) => {
                    console.warn("Gagal membersihkan foto draft", error);
                });
                setLocalDraftData(null);
            }
            setShowDraftDialog(false);
            toast.info("Draft dihapus, mulai laporan baru");
        } catch (error) {
            console.error("Gagal menghapus draft", error);
            toast.error("Gagal menghapus file draft lama");
        } finally {
            setIsDeletingDraft(false);
        }
    }, [localDraftData]);

    // Auto-restore on mount when in edit mode (skip dialog, populate form immediately).
    useEffect(() => {
        if (autoRestore && existingDraft && !hasAutoRestoredRef.current) {
            hasAutoRestoredRef.current = true;
            handleContinueDraft({
                loading: "Memuat laporan...",
                success: "Laporan berhasil dimuat",
            });
        }
        // Only run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-save with debounce
    const debouncedChecklist = useDebounce(checklist, 2000);
    const debouncedBmsItems = useDebounce(bmsItems, 2000);
    const debouncedStoreCode = useDebounce(selectedStoreCode, 2000);

    useEffect(() => {
        if (disableAutoSave) return;
        if (debouncedChecklist.size === 0 && !debouncedStoreCode) return;
        if (isSubmitting) return;

        const checklistItems = serializeChecklistItems(
            debouncedChecklist,
            activeCategories,
        );

        const bmsEstimations: Record<
            string,
            DraftData["bmsEstimations"][string]
        > = {};
        for (const [itemId, group] of debouncedBmsItems) {
            bmsEstimations[itemId] = group.entries.map((entry) => ({
                itemName: entry.itemName,
                quantity: entry.quantity,
                unit: entry.unit,
                price: entry.price,
                totalPrice: entry.total,
            }));
        }

        const totalEstimation = Array.from(debouncedBmsItems.values()).reduce(
            (sum, item) => sum + item.entries.reduce((s, e) => s + e.total, 0),
            0,
        );

        const draftCreatedAt = getOrSetDraftCreatedAt();
        const draftDataPayload: DraftData = {
            draftReportNumber: draftReportId || undefined,
            storeCode: debouncedStoreCode || undefined,
            storeName: store,
            branchName: userBranchName,
            checklistItems,
            bmsEstimations,
            totalEstimation,
            draftCreatedAt,
        };

        try {
            localStorage.setItem(
                LOCAL_STORAGE_KEY,
                JSON.stringify({
                    data: draftDataPayload,
                    savedAt: new Date().toISOString(),
                }),
            );
        } catch (err) {
            console.error(
                "[Auto-save exception] failed to write localStorage",
                err,
            );
        }
    }, [
        debouncedChecklist,
        debouncedBmsItems,
        debouncedStoreCode,
        store,
        userBranchName,
        isSubmitting,
        activeCategories,
        draftReportId,
        disableAutoSave,
    ]);

    const buildDraftData = useCallback((): DraftData => {
        const checklistItems = serializeChecklistItems(
            checklist,
            activeCategories,
            { activeOnly: true, completedOnly: true },
        );

        const bmsEstimations: Record<
            string,
            DraftData["bmsEstimations"][string]
        > = {};
        for (const [itemId, group] of bmsItems) {
            bmsEstimations[itemId] = group.entries.map((entry) => ({
                itemName: entry.itemName,
                quantity: entry.quantity,
                unit: entry.unit,
                price: entry.price,
                totalPrice: entry.total,
            }));
        }

        const draftCreatedAt = getOrSetDraftCreatedAt();
        return {
            draftReportNumber: draftReportId || undefined,
            storeCode: selectedStoreCode || undefined,
            storeName: store,
            branchName: userBranchName,
            checklistItems,
            bmsEstimations,
            totalEstimation: grandTotalBms,
            draftCreatedAt,
        };
    }, [
        checklist,
        bmsItems,
        selectedStoreCode,
        store,
        userBranchName,
        activeCategories,
        grandTotalBms,
        draftReportId,
    ]);

    return {
        draftReportId,
        setDraftReportId,
        showDraftDialog,
        localDraftData,
        isRestoringDraft,
        isDeletingDraft,
        handleContinueDraft,
        handleCreateNew,
        buildDraftData,
    };
}

function getCategoryIdsForItems(
    restored: Map<string, ChecklistItem>,
): Set<string> {
    const itemIds = new Set(restored.keys());
    return new Set(
        checklistCategories
            .filter((cat) => cat.items.some((item) => itemIds.has(item.id)))
            .map((cat) => cat.id),
    );
}
