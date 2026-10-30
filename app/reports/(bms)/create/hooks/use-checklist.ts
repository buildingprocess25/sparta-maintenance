"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
    getLastCategoryIDate,
    getLastSignageDate,
} from "@/app/reports/actions";
import { canSkipPreventive as isSkipEligible } from "@/lib/preventive-skip";
import {
    getNextJakartaQuarterStart,
    isSameJakartaQuarter,
} from "@/lib/time";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import { PREVENTIVE_REQUIRED_ITEM_IDS } from "@/lib/report-preventive";
import { getSignageConfig, isAhoRequiredForItem } from "@/lib/signage";
import type { StoreOption } from "../components/types";
import {
    applySignageSelection,
    fillGroupAhoTicket,
    propagateGroupAhoTicket,
    type SignageChange,
} from "./signage-checklist";
import { filterActiveCategories } from "./preventive-visibility";

export function useChecklist(
    stores: StoreOption[],
    isEditMode?: boolean,
    initialStoreCode?: string,
    signageAhoRequired = false,
) {
    const [checklist, setChecklist] = useState<Map<string, ChecklistItem>>(
        new Map(),
    );
    const [openCategories, setOpenCategories] = useState<Set<string>>(
        new Set(),
    );
    const [selectedStoreCode, setSelectedStoreCode] = useState("");
    const [store, setStore] = useState("");
    const [isCategoryICoolingDown, setIsCategoryICoolingDown] = useState(false);
    const [isSignageCoolingDown, setIsSignageCoolingDown] = useState(false);
    const [categoryIAvailableDate, setCategoryIAvailableDate] =
        useState<Date | null>(null);
    const [skipPreventive, setSkipPreventive] = useState(false);
    const [isSkipAllowed, setIsSkipAllowed] = useState(false);

    // Revisi: skip mengikuti flag laporan. Laporan baru: hanya bila masih layak.
    const isPreventiveSkipped = isEditMode
        ? skipPreventive
        : skipPreventive && isSkipAllowed;
    const canSkipPreventive = !isEditMode && isSkipAllowed;

    // Item inti I1–I10 yang sudah ada di checklist (laporan yang sedang diedit).
    const hasPreventiveItemsInChecklist = PREVENTIVE_REQUIRED_ITEM_IDS.some(
        (itemId) => checklist.has(itemId),
    );

    const activeCategories = filterActiveCategories(checklistCategories, {
        coreCooling: isCategoryICoolingDown || isPreventiveSkipped,
        signageCooling: isSignageCoolingDown || isPreventiveSkipped,
        isEditMode: Boolean(isEditMode),
        checklistItemIds: new Set(checklist.keys()),
    });

    const handleStoreChange = useCallback(
        async (storeCode: string) => {
            const selectedStore = stores.find((s) => s.code === storeCode);
            if (!selectedStore) return;

            setSelectedStoreCode(selectedStore.code);
            setStore(selectedStore.name);
            setSkipPreventive(false);

            try {
                const [lastCoreDate, lastSignageDate] = await Promise.all([
                    getLastCategoryIDate(selectedStore.code),
                    getLastSignageDate(selectedStore.code),
                ]);
                const now = new Date();
                const coreCooling =
                    !!lastCoreDate &&
                    isSameJakartaQuarter(new Date(lastCoreDate), now);
                setIsCategoryICoolingDown(coreCooling);
                setIsSignageCoolingDown(
                    !!lastSignageDate &&
                        isSameJakartaQuarter(new Date(lastSignageDate), now),
                );
                setCategoryIAvailableDate(
                    coreCooling ? getNextJakartaQuarterStart(now) : null,
                );
                setIsSkipAllowed(
                    isSkipEligible({ coreCooling, now }),
                );
            } catch {
                setIsCategoryICoolingDown(false);
                setIsSignageCoolingDown(false);
                setCategoryIAvailableDate(null);
                setIsSkipAllowed(false);
            }
        },
        [stores],
    );

    useEffect(() => {
        if (initialStoreCode && stores.some(s => s.code === initialStoreCode)) {
            handleStoreChange(initialStoreCode);
        }
    }, [initialStoreCode, stores, handleStoreChange]);

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
                const updated = { ...existing, [field]: value };

                if (field === "condition" && value !== "rusak") {
                    updated.handler = "";
                }

                next.set(itemId, updated);
                return field === "ahoTicketNumber"
                    ? propagateGroupAhoTicket(next, itemId)
                    : next;
            });
        },
        [],
    );

    const updateSignageItem = useCallback(
        (itemId: string, itemName: string, change: SignageChange) => {
            setChecklist((prev) => {
                const existing = prev.get(itemId) || {
                    id: itemId,
                    name: itemName,
                    condition: "" as ChecklistCondition,
                    handler: "",
                };
                const next = new Map(prev);
                next.set(itemId, applySignageSelection(existing, change));
                return fillGroupAhoTicket(next, itemId);
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

        if (isCategoryICoolingDown || isPreventiveSkipped) {
            // Signage I.11–I.13 yang tampil wajib diisi sekali per kuartal.
            for (const cat of activeCategories) {
                for (const catalogItem of cat.items) {
                    if (
                        !catalogItem.signage ||
                        checklist.get(catalogItem.id)?.condition
                    ) {
                        continue;
                    }
                    toast.error(
                        `Item "${catalogItem.name}" di kategori "${cat.title}" wajib diisi`,
                    );
                    if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                    scrollToItem(catalogItem.id);
                    return false;
                }
            }

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

                if (
                    item.condition &&
                    item.condition !== "tidak_ada" &&
                    getSignageConfig(item.id) &&
                    !item.signageMaterial
                ) {
                    toast.error(`Item "${item.name}" wajib pilih material`);
                    if (cat && !openCategories.has(cat.id))
                        toggleCategory(cat.id);
                    scrollToItem(item.id);
                    return false;
                }

                if (
                    item.condition === "baik" &&
                    !item.photo &&
                    !item.photoUrl
                ) {
                    toast.error(
                        `Item "${item.name}" kondisi Baik wajib upload foto bukti`,
                    );
                    if (cat && !openCategories.has(cat.id))
                        toggleCategory(cat.id);
                    scrollToItem(item.id);
                    return false;
                }

                if (
                    item.condition === "baik" &&
                    item.signageCondition === "kotor" &&
                    !item.notes?.trim()
                ) {
                    toast.error(
                        `Item "${item.name}" kondisi Kotor wajib isi catatan`,
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
                    if (
                        isAhoRequiredForItem(item.id, signageAhoRequired) &&
                        !item.ahoTicketNumber?.trim()
                    ) {
                        toast.error(
                            `Item "${item.name}" rusak wajib isi nomor tiket AHO`,
                        );
                        if (cat && !openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }
                    if (!item.photo && !item.photoUrl) {
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
                        checkedItem.condition !== "tidak_ada" &&
                        getSignageConfig(item.id) &&
                        !checkedItem.signageMaterial
                    ) {
                        toast.error(`Item "${item.name}" wajib pilih material`);
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }

                    if (
                        checkedItem.condition === "baik" &&
                        !checkedItem.photo &&
                        !checkedItem.photoUrl
                    ) {
                        toast.error(
                            `Item "${item.name}" wajib upload foto bukti`,
                        );
                        if (!openCategories.has(cat.id))
                            toggleCategory(cat.id);
                        scrollToItem(item.id);
                        return false;
                    }

                    if (
                        checkedItem.condition === "baik" &&
                        checkedItem.signageCondition === "kotor" &&
                        !checkedItem.notes?.trim()
                    ) {
                        toast.error(
                            `Item "${item.name}" kondisi Kotor wajib isi catatan`,
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
                        if (
                            isAhoRequiredForItem(item.id, signageAhoRequired) &&
                            !checkedItem.ahoTicketNumber?.trim()
                        ) {
                            toast.error(
                                `Item "${item.name}" rusak wajib isi nomor tiket AHO`,
                            );
                            if (!openCategories.has(cat.id))
                                toggleCategory(cat.id);
                            scrollToItem(item.id);
                            return false;
                        }
                        if (!checkedItem.photo && !checkedItem.photoUrl) {
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
        isPreventiveSkipped,
        signageAhoRequired,
        activeCategories,
        checklist,
        openCategories,
        toggleCategory,
    ]);

    const devAutofill = useCallback(() => {
        if (process.env.NODE_ENV !== "development") return;

        // Open all categories
        const allCatIds = activeCategories.map((c) => c.id);
        setOpenCategories(new Set(allCatIds));

        setChecklist((prev) => {
            const next = new Map(prev);

            const nonPreventiveItems = activeCategories
                .filter((cat) => !cat.isPreventive)
                .flatMap((cat) => cat.items);

            // Shuffle nonPreventiveItems
            const shuffled = [...nonPreventiveItems];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            const rusakCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
            const rusakIds = new Set(shuffled.slice(0, rusakCount).map(i => i.id));
            const baikIds = new Set(shuffled.slice(rusakCount, rusakCount + 2).map(i => i.id));

            for (const cat of activeCategories) {
                for (const item of cat.items) {
                    let condition: ChecklistCondition;
                    if (cat.isPreventive) {
                        condition = "baik";
                    } else if (rusakIds.has(item.id)) {
                        condition = "rusak";
                    } else if (baikIds.has(item.id)) {
                        condition = "baik";
                    } else {
                        condition = "tidak_ada";
                    }

                    const isBroken = condition === "rusak";
                    const isGood = condition === "baik";

                    next.set(item.id, {
                        id: item.id,
                        name: item.name,
                        condition,
                        handler: isBroken ? "BMS" : "",
                        photoUrl: isBroken || isGood
                            ? `https://picsum.photos/seed/${item.id.replace(/[^a-zA-Z0-9]/g, "")}/400/300`
                            : undefined,
                        notes: isBroken
                            ? "Catatan perbaikan item rusak oleh tim BMS (Dev Mode)"
                            : undefined,
                        ahoTicketNumber: isBroken
                            ? `AHO-${Math.floor(100000 + Math.random() * 900000)}`
                            : undefined,
                        ...(getSignageConfig(item.id)
                            ? {
                                  signageMaterial:
                                      getSignageConfig(item.id)!.materials[0],
                                  signageCondition: "baik" as const,
                              }
                            : {}),
                    });
                }
            }
            return next;
        });
        toast.success("Autofill dev mode selesai!");
    }, [activeCategories]);

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
        isSignageCoolingDown,
        categoryIAvailableDate,
        canSkipPreventive,
        isPreventiveSkipped,
        setSkipPreventive,
        activeCategories,
        handleStoreChange,
        toggleCategory,
        updateChecklistItem,
        updateSignageItem,
        validateStep1,
        devAutofill,
        hasPreventiveItemsInChecklist,
    };
}
