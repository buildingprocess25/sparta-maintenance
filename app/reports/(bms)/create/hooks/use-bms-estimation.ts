"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import type { BmsItemEntry, BmsItemGroup } from "../components/types";

export function useBmsEstimation() {
    const [bmsItems, setBmsItems] = useState<Map<string, BmsItemGroup>>(
        new Map(),
    );

    const buildBmsMapFromChecklist = useCallback(
        (
            checklist: Map<string, ChecklistItem>,
            existingBmsItems: Map<string, BmsItemGroup>,
        ) => {
            const bmsMap = new Map<string, BmsItemGroup>();

            for (const [id, item] of checklist) {
                if (item.condition !== "rusak" || item.handler !== "BMS")
                    continue;

                let categoryData: ChecklistCategory | undefined;
                for (const cat of checklistCategories) {
                    if (cat.items.some((i) => i.id === id)) {
                        categoryData = cat;
                        break;
                    }
                }

                if (categoryData) {
                    const existingGroup = existingBmsItems.get(id);
                    bmsMap.set(id, {
                        checklistItem: item,
                        categoryTitle: categoryData.title,
                        entries: existingGroup?.entries ?? [],
                    });
                }
            }

            setBmsItems(bmsMap);
        },
        [],
    );

    const addBmsEntry = useCallback((itemId: string) => {
        setBmsItems((prev) => {
            const next = new Map(prev);
            const itemGroup = next.get(itemId);
            if (itemGroup) {
                const newEntry: BmsItemEntry = {
                    id: `entry_${Date.now()}_${Math.random()}`,
                    categoryId: "",
                    categoryTitle: itemGroup.categoryTitle,
                    itemName: "",
                    quantity: 0,
                    unit: "",
                    price: 0,
                    total: 0,
                };
                next.set(itemId, {
                    ...itemGroup,
                    entries: [...itemGroup.entries, newEntry],
                });
            }
            return next;
        });
    }, []);

    const updateBmsEntry = useCallback(
        (
            itemId: string,
            entryId: string,
            field: "itemName" | "quantity" | "unit" | "price",
            value: string | number,
        ) => {
            setBmsItems((prev) => {
                const next = new Map(prev);
                const itemGroup = next.get(itemId);
                if (itemGroup) {
                    const entryIndex = itemGroup.entries.findIndex(
                        (e) => e.id === entryId,
                    );
                    if (entryIndex !== -1) {
                        const updated = {
                            ...itemGroup.entries[entryIndex],
                            [field]: value,
                        };
                        if (field === "quantity" || field === "price") {
                            updated.total = updated.quantity * updated.price;
                        }
                        const updatedEntries = [...itemGroup.entries];
                        updatedEntries[entryIndex] = updated;
                        next.set(itemId, {
                            ...itemGroup,
                            entries: updatedEntries,
                        });
                    }
                }
                return next;
            });
        },
        [],
    );

    const removeBmsEntry = useCallback((itemId: string, entryId: string) => {
        setBmsItems((prev) => {
            const next = new Map(prev);
            const itemGroup = next.get(itemId);
            if (itemGroup) {
                next.set(itemId, {
                    ...itemGroup,
                    entries: itemGroup.entries.filter((e) => e.id !== entryId),
                });
            }
            return next;
        });
    }, []);

    const validateStep2 = useCallback((): boolean => {
        for (const [itemId, itemGroup] of Array.from(bmsItems.entries())) {
            const scrollToBmsEntry = (entryId?: string) => {
                setTimeout(() => {
                    const el = document.getElementById(
                        entryId ? `bms-${itemId}-${entryId}` : `bms-${itemId}`,
                    );
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
            };

            if (itemGroup.entries.length === 0) {
                toast.error(
                    `Item "${itemGroup.checklistItem.name}" harus memiliki minimal 1 barang`,
                );
                scrollToBmsEntry();
                return false;
            }

            for (const entry of itemGroup.entries) {
                if (!entry.itemName.trim()) {
                    toast.error(
                        `Nama barang untuk "${itemGroup.checklistItem.name}" wajib diisi`,
                    );
                    scrollToBmsEntry(entry.id);
                    return false;
                }
                if (entry.quantity <= 0) {
                    toast.error(
                        `Quantity untuk "${entry.itemName}" wajib diisi`,
                    );
                    scrollToBmsEntry(entry.id);
                    return false;
                }
                if (entry.price < 0) {
                    toast.error(
                        `Harga untuk "${entry.itemName}" tidak boleh minus`,
                    );
                    scrollToBmsEntry(entry.id);
                    return false;
                }
            }
        }
        return true;
    }, [bmsItems]);

    const grandTotalBms = Array.from(bmsItems.values()).reduce(
        (sum, item) => sum + item.entries.reduce((s, e) => s + e.total, 0),
        0,
    );

    return {
        bmsItems,
        setBmsItems,
        grandTotalBms,
        buildBmsMapFromChecklist,
        addBmsEntry,
        updateBmsEntry,
        removeBmsEntry,
        validateStep2,
    };
}
