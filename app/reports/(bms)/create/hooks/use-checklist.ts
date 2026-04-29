"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getLastCategoryIDate } from "@/app/reports/actions";

/** Kuartal: 0=Q1(Jan-Mar), 1=Q2(Apr-Jun), 2=Q3(Jul-Sep), 3=Q4(Okt-Des) */
function getQuarter(d: Date): number {
    return Math.floor(d.getMonth() / 3);
}

function isSameQuarter(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        getQuarter(d1) === getQuarter(d2)
    );
}

function getNextQuarterStart(d: Date): Date {
    const q = getQuarter(d);
    const y = d.getFullYear();
    return q === 3 ? new Date(y + 1, 0, 1) : new Date(y, (q + 1) * 3, 1);
}
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import type { StoreOption } from "../components/types";

export function useChecklist(stores: StoreOption[], isEditMode?: boolean) {
    const [checklist, setChecklist] = useState<Map<string, ChecklistItem>>(
        new Map(),
    );
    const [openCategories, setOpenCategories] = useState<Set<string>>(
        new Set(),
    );
    const [selectedStoreCode, setSelectedStoreCode] = useState("");
    const [store, setStore] = useState("");
    const [isCategoryICoolingDown, setIsCategoryICoolingDown] = useState(false);
    const [categoryIAvailableDate, setCategoryIAvailableDate] =
        useState<Date | null>(null);

    const preventiveItemIds = new Set(
        checklistCategories
            .filter((cat) => cat.isPreventive)
            .flatMap((cat) => cat.items.map((item) => item.id)),
    );

    const hasPreventiveItemsInChecklist = Array.from(checklist.keys()).some(
        (itemId) => preventiveItemIds.has(itemId),
    );

    // During cooldown, preventive category is hidden.
    // In edit/revisi mode, only keep it visible if the loaded report already
    // contains preventive items, so existing data can still be revised.
    const activeCategories = checklistCategories.filter(
        (cat) =>
            !(
                cat.isPreventive &&
                isCategoryICoolingDown &&
                (!isEditMode || !hasPreventiveItemsInChecklist)
            ),
    );

    const handleStoreChange = useCallback(
        async (storeCode: string) => {
            const selectedStore = stores.find((s) => s.code === storeCode);
            if (!selectedStore) return;

            setSelectedStoreCode(selectedStore.code);
            setStore(selectedStore.name);

            try {
                const lastDate = await getLastCategoryIDate(selectedStore.code);
                if (lastDate) {
                    const lastSubmission = new Date(lastDate);
                    const now = new Date();
                    const cooling = isSameQuarter(lastSubmission, now);
                    setIsCategoryICoolingDown(cooling);
                    setCategoryIAvailableDate(
                        cooling ? getNextQuarterStart(now) : null,
                    );
                } else {
                    setIsCategoryICoolingDown(false);
                    setCategoryIAvailableDate(null);
                }
            } catch {
                setIsCategoryICoolingDown(false);
                setCategoryIAvailableDate(null);
            }
        },
        [stores],
    );

    const toggleCategory = useCallback((categoryId: string) => {
        setOpenCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    }, []);

    const updateChecklistItem = useCallback(
        (
            itemId: string,
            itemName: string,
            field: keyof ChecklistItem,
            value: ChecklistCondition | File | string | undefined,
        ) => {
            setChecklist((prev) => {
                const next = new Map(prev);
                const existing = next.get(itemId) || {
                    id: itemId,
                    name: itemName,
                    condition: "" as ChecklistCondition,
                    handler: "",
                };
                next.set(itemId, { ...existing, [field]: value });
                return next;
            });
        },
        [],
    );

    const validateStep1 = useCallback((): boolean => {
        if (!store.trim()) {
            toast.error("Toko wajib diisi");
            return false;
        }

        const scrollToItem = (itemId: string) => {
            setTimeout(() => {
                document
                    .getElementById(`item-${itemId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 150);
        };

        if (isCategoryICoolingDown) {
            // Cooldown aktif: item A–H tidak wajib diisi semua.
            // Namun minimal satu item harus terisi.
            const filledItems = [...checklist.values()].filter(
                (item) => !!item.condition,
            );
            if (filledItems.length === 0) {
                toast.error(
                    "Minimal satu item checklist harus diisi sebelum melanjutkan",
                );
                return false;
            }

            // Hanya validasi konsistensi untuk item yang sudah diisi.
            for (const [, item] of checklist) {
                const cat = activeCategories.find((c) =>
                    c.items.some((i) => i.id === item.id),
                );

                if (item.condition === "baik" && !item.photo) {
                    toast.error(
                        `Item "${item.name}" kondisi Baik wajib upload foto bukti`,
                    );
                    if (cat && !openCategories.has(cat.id))
                        toggleCategory(cat.id);
                    scrollToItem(item.id);
                    return false;
                }

                if (item.condition === "rusak") {
                    if (!item.notes?.trim()) {
                        toast.error(
                            `Item "${item.name}" rusak wajib isi catatan`,
                        );
                        if (cat && !openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
                    if (!item.photo) {
                        toast.error(
                            `Item "${item.name}" rusak wajib upload foto`,
                        );
                        if (cat && !openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
                    if (!item.handler) {
                        toast.error(
                            `Item "${item.name}" rusak wajib pilih handler`,
                        );
                        if (cat && !openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
                }
            }
        } else {
            // Laporan preventif triwulan: semua item wajib diisi.
            for (const cat of activeCategories) {
                for (const item of cat.items) {
                    const checkedItem = checklist.get(item.id);

                    if (!checkedItem || !checkedItem.condition) {
                        toast.error(
                            `Item "${item.name}" di kategori "${cat.title}" wajib diisi`,
                        );
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }

                    if (
                        checkedItem.condition === "baik" &&
                        !checkedItem.photo
                    ) {
                        toast.error(
                            `Item "${item.name}" wajib upload foto bukti`,
                        );
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }

                    if (checkedItem.condition === "rusak") {
                        if (!checkedItem.notes?.trim()) {
                            toast.error(
                                `Item "${item.name}" rusak wajib isi catatan`,
                            );
                            if (!openCategories.has(cat.id))
                                toggleCategory(cat.id);
                            scrollToItem(item.id);
                            return false;
                        }
                        if (!checkedItem.photo) {
                            toast.error(
                                `Item "${item.name}" rusak wajib upload foto`,
                            );
                            if (!openCategories.has(cat.id))
                                toggleCategory(cat.id);
                            scrollToItem(item.id);
                            return false;
                        }
                        if (!checkedItem.handler) {
                            toast.error(
                                `Item "${item.name}" rusak wajib pilih handler`,
                            );
                            if (!openCategories.has(cat.id))
                                toggleCategory(cat.id);
                            scrollToItem(item.id);
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }, [
        store,
        isCategoryICoolingDown,
        activeCategories,
        checklist,
        openCategories,
        toggleCategory,
    ]);

    return {
        checklist,
        setChecklist,
        openCategories,
        setOpenCategories,
        selectedStoreCode,
        setSelectedStoreCode,
        store,
        setStore,
        isCategoryICoolingDown,
        categoryIAvailableDate,
        activeCategories,
        handleStoreChange,
        toggleCategory,
        updateChecklistItem,
        validateStep1,
    };
}
