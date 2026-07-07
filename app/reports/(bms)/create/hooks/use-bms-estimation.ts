"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
    checklistCategories,
    unitOptions,
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

    const addBmsEntryWithDetails = useCallback((
        itemId: string,
        details: { itemName: string; quantity: number; unit: string; price: number }
    ) => {
        setBmsItems((prev) => {
            const next = new Map(prev);
            const itemGroup = next.get(itemId);
            if (itemGroup) {
                const newEntry: BmsItemEntry = {
                    id: `entry_${Date.now()}_${Math.random()}`,
                    categoryId: "",
                    categoryTitle: itemGroup.categoryTitle,
                    itemName: details.itemName,
                    quantity: details.quantity,
                    unit: details.unit,
                    price: details.price,
                    total: details.quantity * details.price,
                };
                next.set(itemId, {
                    ...itemGroup,
                    entries: [...itemGroup.entries, newEntry],
                });
            }
            return next;
        });
    }, []);

    const updateBmsEntryWithDetails = useCallback(
        (
            itemId: string,
            entryId: string,
            details: { itemName: string; quantity: number; unit: string; price: number }
        ) => {
            setBmsItems((prev) => {
                const next = new Map(prev);
                const itemGroup = next.get(itemId);
                if (itemGroup) {
                    const entryIndex = itemGroup.entries.findIndex((e) => e.id === entryId);
                    if (entryIndex !== -1) {
                        const updated = {
                            ...itemGroup.entries[entryIndex],
                            itemName: details.itemName,
                            quantity: details.quantity,
                            unit: details.unit,
                            price: details.price,
                            total: details.quantity * details.price,
                        };
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

    const devAutofillBms = useCallback((bmsItemsList: ChecklistItem[]) => {
        if (process.env.NODE_ENV !== "development") return;

        const sampleItems = [
            { name: "Cat Tembok", priceRange: [50000, 150000] },
            { name: "Paku", priceRange: [25000, 75000] },
            { name: "Semen", priceRange: [60000, 100000] },
            { name: "Pasir", priceRange: [200000, 500000] },
            { name: "Papan Kayu", priceRange: [80000, 200000] },
            { name: "Gypsum", priceRange: [40000, 120000] },
            { name: "Kabel Listrik", priceRange: [15000, 80000] },
            { name: "Pipa PVC", priceRange: [30000, 100000] },
            { name: "Keramik", priceRange: [100000, 300000] },
            { name: "Lem", priceRange: [20000, 60000] },
        ];

        setBmsItems((prev) => {
            const next = new Map(prev);
            let itemsAdded = 0;

            bmsItemsList.forEach((item) => {
                const itemGroup = next.get(item.id);
                if (itemGroup && itemGroup.entries.length === 0) {
                    const entriesToAdd = Math.floor(Math.random() * 2) + 2; // 2 to 3 materials
                    const newEntries = [...itemGroup.entries];

                    for (let i = 0; i < entriesToAdd; i++) {
                        const sampleItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
                        const unit = unitOptions[Math.floor(Math.random() * unitOptions.length)];
                        const quantity = Math.floor(Math.random() * 10) + 1;
                        const priceBase = Math.floor(
                            (Math.random() * (sampleItem.priceRange[1] - sampleItem.priceRange[0])) / 10000
                        ) * 10000 + sampleItem.priceRange[0];
                        const price = Math.round(priceBase / 5000) * 5000;

                        newEntries.push({
                            id: `${item.id}-entry-${Date.now()}-${i}`,
                            categoryId: "",
                            categoryTitle: itemGroup.categoryTitle,
                            itemName: sampleItem.name,
                            quantity,
                            unit,
                            price,
                            total: quantity * price,
                        });
                        itemsAdded++;
                    }
                    next.set(item.id, {
                        ...itemGroup,
                        entries: newEntries,
                    });
                }
            });
            if (itemsAdded > 0) {
                toast.success(`${itemsAdded} barang berhasil ditambahkan secara otomatis!`);
            }
            return next;
        });
    }, []);

    return {
        bmsItems,
        setBmsItems,
        grandTotalBms,
        buildBmsMapFromChecklist,
        addBmsEntry,
        addBmsEntryWithDetails,
        updateBmsEntry,
        updateBmsEntryWithDetails,
        removeBmsEntry,
        validateStep2,
        devAutofillBms,
    };
}
