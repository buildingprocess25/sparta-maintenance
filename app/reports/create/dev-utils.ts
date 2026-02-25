"use client";

import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
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

    const DUMMY_IMAGE_URL =
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=640&q=80&fm=jpg";

    (async () => {
        const loadingToast = toast.loading("Auto-filling + uploading foto...");

        let dummyFileBlob: Blob | null = null;
        try {
            const res = await fetch(DUMMY_IMAGE_URL);
            dummyFileBlob = await res.blob();
        } catch {
            console.warn("Gagal fetch dummy image, foto tidak akan diisi");
        }

        const newChecklist = new Map<string, ChecklistItem>();
        let itemIndex = 0;

        for (const category of activeCategories) {
            for (const item of category.items) {
                itemIndex++;
                let allowedConditions: ChecklistCondition[] = [
                    "baik",
                    "rusak",
                    "tidak-ada",
                ];
                if (category.isPreventive) {
                    allowedConditions = ["baik", "rusak"];
                }

                const condition =
                    allowedConditions[itemIndex % allowedConditions.length];
                const checklistItem: ChecklistItem = {
                    id: item.id,
                    name: item.name,
                    condition,
                    handler: "",
                };

                if (
                    dummyFileBlob &&
                    (condition === "baik" || condition === "rusak")
                ) {
                    const file = new File(
                        [dummyFileBlob],
                        `foto_${item.id}.jpg`,
                        { type: "image/jpeg" },
                    );

                    try {
                        const compressed = await imageCompression(file, {
                            maxSizeMB: 0.1,
                            maxWidthOrHeight: 1280,
                            useWebWorker: true,
                        });

                        const safeItemName = item.name
                            .replace(/[^a-zA-Z0-9]/g, "_")
                            .toLowerCase();
                        const filePath = `${ctx.branchName}/${ctx.storeCode}/${ctx.draftReportId}/${item.id}_${safeItemName}.jpg`;

                        const { data, error } = await supabase.storage
                            .from("reports")
                            .upload(filePath, compressed, { upsert: true });

                        if (!error && data) {
                            const {
                                data: { publicUrl },
                            } = supabase.storage
                                .from("reports")
                                .getPublicUrl(data.path);

                            checklistItem.photo = compressed;
                            checklistItem.photoUrl = publicUrl;
                        } else {
                            checklistItem.photo = file;
                        }
                    } catch {
                        checklistItem.photo = file;
                    }
                }

                if (condition === "rusak") {
                    checklistItem.handler =
                        itemIndex % 2 === 0 ? "BMS" : "Rekanan";
                }

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
