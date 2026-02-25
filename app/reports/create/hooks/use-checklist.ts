"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getLastCategoryIDate } from "@/app/reports/actions";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import type { StoreOption } from "../components/types";

export function useChecklist(stores: StoreOption[]) {
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

    const activeCategories = checklistCategories.filter(
        (cat) => !(cat.isPreventive && isCategoryICoolingDown),
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
                    const cooldownMs = 3 * 30 * 24 * 60 * 60 * 1000;
                    const lastTime = new Date(lastDate).getTime();
                    const cooling = Date.now() - lastTime < cooldownMs;
                    setIsCategoryICoolingDown(cooling);
                    setCategoryIAvailableDate(
                        cooling ? new Date(lastTime + cooldownMs) : null,
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

        for (const cat of activeCategories) {
            for (const item of cat.items) {
                const checkedItem = checklist.get(item.id);

                const scrollToItem = () => {
                    setTimeout(() => {
                        document
                            .getElementById(`item-${item.id}`)
                            ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                    }, 150);
                };

                if (!checkedItem || !checkedItem.condition) {
                    toast.error(
                        `Item "${item.name}" di kategori "${cat.title}" wajib diisi`,
                    );
                    if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                    scrollToItem();
                    return false;
                }

                if (
                    cat.isPreventive &&
                    checkedItem.condition ===
                        ("tidak-ada" as ChecklistCondition)
                ) {
                    toast.error(
                        `Item "${item.name}" di kategori "${cat.title}" tidak valid (Mode Preventive)`,
                    );
                    if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                    scrollToItem();
                    return false;
                }

                if (checkedItem.condition === "baik" && !checkedItem.photo) {
                    toast.error(`Item "${item.name}" wajib upload foto bukti`);
                    if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                    scrollToItem();
                    return false;
                }

                if (checkedItem.condition === "rusak") {
                    if (!checkedItem.photo) {
                        toast.error(
                            `Item "${item.name}" rusak wajib upload foto`,
                        );
                        if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                        scrollToItem();
                        return false;
                    }
                    if (!checkedItem.handler) {
                        toast.error(
                            `Item "${item.name}" rusak wajib pilih handler`,
                        );
                        if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                        scrollToItem();
                        return false;
                    }
                }
            }
        }
        return true;
    }, [store, activeCategories, checklist, openCategories, toggleCategory]);

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
