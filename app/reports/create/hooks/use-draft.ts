"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { saveDraft, deleteDraft } from "@/app/reports/actions";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import type {
    SerializedDraft,
    StoreOption,
    BmsItemEntry,
    BmsItemGroup,
} from "../components/types";
import type { DraftData } from "@/app/reports/actions";

type UseDraftParams = {
    existingDraft?: SerializedDraft | null;
    stores: StoreOption[];
    checklist: Map<string, ChecklistItem>;
    setChecklist: React.Dispatch<
        React.SetStateAction<Map<string, ChecklistItem>>
    >;
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
};

export function useDraft({
    existingDraft,
    stores,
    checklist,
    setChecklist,
    bmsItems,
    setBmsItems,
    selectedStoreCode,
    store,
    userBranchName,
    activeCategories,
    grandTotalBms,
    isSubmitting,
    handleStoreChange,
}: UseDraftParams) {
    const [draftReportId, setDraftReportId] = useState<string | null>(
        existingDraft?.reportNumber || null,
    );
    const [showDraftDialog, setShowDraftDialog] = useState(!!existingDraft);
    const [isRestoringDraft, setIsRestoringDraft] = useState(false);
    const [isDeletingDraft, setIsDeletingDraft] = useState(false);

    const handleContinueDraft = useCallback(async () => {
        if (!existingDraft) return;
        setIsRestoringDraft(true);
        try {
            if (existingDraft.storeCode) {
                const s = stores.find(
                    (st) => st.code === existingDraft.storeCode,
                );
                if (s) {
                    await handleStoreChange(s.code);
                }
            }

            const fetchPhoto = async (
                item: (typeof existingDraft.items)[number],
            ): Promise<File | undefined> => {
                if (
                    !item.photoUrl ||
                    (!item.photoUrl.startsWith("data:image") &&
                        !item.photoUrl.startsWith("http"))
                )
                    return undefined;
                try {
                    const res = await fetch(item.photoUrl);
                    const blob = await res.blob();
                    return new File([blob], `${item.itemName}.jpg`, {
                        type: "image/jpeg",
                    });
                } catch (e) {
                    console.error("Gagal restore file dari draft", e);
                    return undefined;
                }
            };

            const restoredFiles = await Promise.all(
                existingDraft.items.map(fetchPhoto),
            );

            const restored = new Map<string, ChecklistItem>();
            existingDraft.items.forEach((item, i) => {
                restored.set(item.itemId, {
                    id: item.itemId,
                    name: item.itemName,
                    condition:
                        item.condition === "TIDAK_ADA"
                            ? "tidak-ada"
                            : ((item.condition?.toLowerCase() ||
                                  "") as ChecklistCondition),
                    handler:
                        item.handler === "BMS"
                            ? "BMS"
                            : item.handler === "REKANAN" ||
                                item.handler === "Rekanan"
                              ? "Rekanan"
                              : "",
                    photoUrl: item.photoUrl || undefined,
                    photo: restoredFiles[i],
                    notes: item.notes || undefined,
                });
            });

            setChecklist(restored);

            if (existingDraft.estimations?.length > 0) {
                const restoredBms = new Map<string, BmsItemGroup>();
                for (const est of existingDraft.estimations) {
                    const checklistItem = restored.get(est.itemId);
                    if (!checklistItem) continue;

                    let categoryTitle = "";
                    for (const cat of checklistCategories) {
                        if (cat.items.some((i) => i.id === est.itemId)) {
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
                setBmsItems(restoredBms);
            }

            setShowDraftDialog(false);
            toast.success("Draft dilanjutkan");
        } finally {
            setIsRestoringDraft(false);
        }
    }, [existingDraft, stores, setChecklist, setBmsItems, handleStoreChange]);

    const handleCreateNew = useCallback(async () => {
        setIsDeletingDraft(true);
        try {
            if (existingDraft) {
                await deleteDraft(existingDraft.reportNumber);
            }
            setShowDraftDialog(false);
            toast.info("Draft dihapus, mulai laporan baru");
        } catch (error) {
            console.error("Gagal menghapus draft", error);
            toast.error("Gagal menghapus draft lama");
        } finally {
            setIsDeletingDraft(false);
        }
    }, [existingDraft]);

    // Auto-save with debounce
    const debouncedChecklist = useDebounce(checklist, 2000);
    const debouncedBmsItems = useDebounce(bmsItems, 2000);
    const debouncedStoreCode = useDebounce(selectedStoreCode, 2000);

    useEffect(() => {
        if (debouncedChecklist.size === 0 && !debouncedStoreCode) return;
        if (isSubmitting) return;

        const checklistItems = Array.from(debouncedChecklist.values()).map(
            (item) => {
                let categoryName = "";
                for (const cat of activeCategories) {
                    if (cat.items.some((i) => i.id === item.id)) {
                        categoryName = cat.title;
                        break;
                    }
                }
                return {
                    itemId: item.id,
                    itemName: item.name,
                    categoryName,
                    condition:
                        item.condition === "baik"
                            ? ("BAIK" as const)
                            : item.condition === "rusak"
                              ? ("RUSAK" as const)
                              : item.condition === "tidak-ada"
                                ? ("TIDAK_ADA" as const)
                                : undefined,
                    handler:
                        item.handler === "BMS"
                            ? ("BMS" as const)
                            : item.handler === "Rekanan"
                              ? ("REKANAN" as const)
                              : undefined,
                    photoUrl: item.photoUrl,
                    notes: item.notes,
                };
            },
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

        (async () => {
            try {
                const res = await saveDraft({
                    storeCode: debouncedStoreCode || undefined,
                    storeName: store,
                    branchName: userBranchName,
                    checklistItems,
                    bmsEstimations,
                    totalEstimation,
                });

                if (res.error) {
                    toast.error(`Auto-save gagal: ${res.detail || res.error}`);
                    console.error("[Auto-save error]", res);
                } else if (res.reportId && res.reportId !== draftReportId) {
                    setDraftReportId(res.reportId);
                }
            } catch (err) {
                console.error("[Auto-save exception]", err);
            }
        })();
    }, [
        debouncedChecklist,
        debouncedBmsItems,
        debouncedStoreCode,
        store,
        userBranchName,
        isSubmitting,
        activeCategories,
        draftReportId,
    ]);

    const buildDraftData = useCallback((): DraftData => {
        const validItemIds = new Set<string>();
        activeCategories.forEach((cat) =>
            cat.items.forEach((item) => validItemIds.add(item.id)),
        );

        const checklistItems = Array.from(checklist.values())
            .filter((item) => item.condition && validItemIds.has(item.id))
            .map((item) => {
                let categoryName = "";
                for (const cat of activeCategories) {
                    if (cat.items.some((i) => i.id === item.id)) {
                        categoryName = cat.title;
                        break;
                    }
                }
                return {
                    itemId: item.id,
                    itemName: item.name,
                    categoryName,
                    condition:
                        item.condition === "baik"
                            ? ("BAIK" as const)
                            : item.condition === "rusak"
                              ? ("RUSAK" as const)
                              : item.condition === "tidak-ada"
                                ? ("TIDAK_ADA" as const)
                                : undefined,
                    handler:
                        item.handler === "BMS"
                            ? ("BMS" as const)
                            : item.handler === "Rekanan"
                              ? ("REKANAN" as const)
                              : undefined,
                    photoUrl: item.photoUrl,
                    notes: item.notes,
                };
            });

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

        return {
            storeCode: selectedStoreCode || undefined,
            storeName: store,
            branchName: userBranchName,
            checklistItems,
            bmsEstimations,
            totalEstimation: grandTotalBms,
        };
    }, [
        checklist,
        bmsItems,
        selectedStoreCode,
        store,
        userBranchName,
        activeCategories,
        grandTotalBms,
    ]);

    return {
        draftReportId,
        setDraftReportId,
        showDraftDialog,
        isRestoringDraft,
        isDeletingDraft,
        handleContinueDraft,
        handleCreateNew,
        buildDraftData,
    };
}
