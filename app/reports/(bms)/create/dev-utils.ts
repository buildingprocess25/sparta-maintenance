"use client";

import { toast } from "sonner";
import {
    checklistCategories,
    unitOptions,
    type ChecklistItem,
    type ChecklistCondition,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import type { BmsItemEntry, BmsItemGroup } from "./components/types";

type AutoFillContext = {
    storeCode: string;
    branchName: string;
    draftReportId: string;
};

export function autoFillStep1(
    activeCategories: ChecklistCategory[],
    setOpenCategories: (val: Set<string>) => void,
    setChecklist: React.Dispatch<
        React.SetStateAction<Map<string, ChecklistItem>>
    >,
    ctx: AutoFillContext,
) {
    const allCategoryIds = checklistCategories.map((cat) => cat.id);
    setOpenCategories(new Set(allCategoryIds));

    (async () => {
        const loadingToast = toast.loading("Auto-filling...");

        // Pre-assign conditions for non-preventive items
        const nonPreventiveItemIds: string[] = [];
        for (const category of activeCategories) {
            if (!category.isPreventive) {
                for (const item of category.items) {
                    nonPreventiveItemIds.push(item.id);
                }
            }
        }

        const shuffle = <T>(arr: T[]): T[] => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        const rusakCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
        const shuffled = shuffle(nonPreventiveItemIds);
        const rusakIds = new Set(shuffled.slice(0, rusakCount));
        const baikIds = new Set(shuffled.slice(rusakCount, rusakCount + 2));

        const newChecklist = new Map<string, ChecklistItem>();

        for (const category of activeCategories) {
            for (const item of category.items) {
                let condition: ChecklistCondition;
                if (category.isPreventive) {
                    condition = "baik";
                } else if (rusakIds.has(item.id)) {
                    condition = "rusak";
                } else if (baikIds.has(item.id)) {
                    condition = "baik";
                } else {
                    condition = "tidak-ada";
                }
                const checklistItem: ChecklistItem = {
                    id: item.id,
                    name: item.name,
                    condition,
                    handler: condition === "rusak" ? "BMS" : "",
                };

                newChecklist.set(item.id, checklistItem);
            }
        }

        setChecklist(newChecklist);
        toast.success("Auto-fill selesai!", { id: loadingToast });
    })();
}

export function autoFillStep2(
    bmsItems: Map<string, BmsItemGroup>,
    setBmsItems: React.Dispatch<
        React.SetStateAction<Map<string, BmsItemGroup>>
    >,
) {
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

    const newBmsItems = new Map(bmsItems);
    let itemsAdded = 0;

    for (const [itemId, itemGroup] of newBmsItems) {
        let categoryData: ChecklistCategory | undefined;
        for (const cat of checklistCategories) {
            if (cat.items.some((i) => i.id === itemGroup.checklistItem.id)) {
                categoryData = cat;
                break;
            }
        }
        if (!categoryData) continue;

        const entriesToAdd = Math.floor(Math.random() * 2) + 2;
        const newEntries = [...itemGroup.entries];

        for (let i = 0; i < entriesToAdd; i++) {
            const sampleItem =
                sampleItems[Math.floor(Math.random() * sampleItems.length)];
            const unit =
                unitOptions[Math.floor(Math.random() * unitOptions.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;
            const priceBase =
                Math.floor(
                    (Math.random() *
                        (sampleItem.priceRange[1] - sampleItem.priceRange[0])) /
                        10000,
                ) *
                    10000 +
                sampleItem.priceRange[0];
            const price = Math.round(priceBase / 5000) * 5000;

            newEntries.push({
                id: `${itemId}-entry-${Date.now()}-${i}`,
                categoryId: categoryData.id,
                categoryTitle: categoryData.title,
                itemName: sampleItem.name,
                quantity,
                unit,
                price,
                total: quantity * price,
            } satisfies BmsItemEntry);
            itemsAdded++;
        }

        newBmsItems.set(itemId, { ...itemGroup, entries: newEntries });
    }

    setBmsItems(newBmsItems);
    toast.success(`${itemsAdded} barang berhasil ditambahkan!`);
}
