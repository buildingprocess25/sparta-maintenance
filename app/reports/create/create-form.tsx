"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { DraftDialog } from "./draft-dialog";
import {
    saveDraft,
    deleteDraft,
    getLastCategoryIDate,
} from "@/app/reports/actions";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Zap } from "lucide-react";
import {
    checklistCategories,
    unitOptions,
    type ChecklistItem,
    type ChecklistCondition,
    type ChecklistCategory,
} from "@/lib/checklist-data";
import { submitReport, type DraftData } from "@/app/reports/actions";

// Extracted components
import type {
    BmsItemEntry,
    BmsItemGroup,
    CreateReportFormProps,
} from "./components/types";
export type { StoreOption, SerializedDraft } from "./components/types";
import { StoreSelectDialog } from "./components/store-select-dialog";
import { PhotoPreviewOverlay } from "./components/photo-preview-overlay";
import { ProgressBar } from "./components/progress-bar";
import { ChecklistStep } from "./components/checklist-step";
import { BmsEstimationStep } from "./components/bms-estimation-step";

export default function CreateReportForm({
    stores,
    userBranchName,
    existingDraft,
    userInfo,
}: CreateReportFormProps) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [openCategories, setOpenCategories] = useState<Set<string>>(
        new Set(),
    );
    const [selectedStoreCode, setSelectedStoreCode] = useState("");
    const [store, setStore] = useState("");
    const [draftReportId, setDraftReportId] = useState<string | null>(
        existingDraft?.reportNumber || null,
    );

    // Handler untuk memilih toko dari dropdown
    const handleStoreChange = async (storeCode: string) => {
        const selectedStore = stores.find((s) => s.code === storeCode);
        if (selectedStore) {
            setSelectedStoreCode(selectedStore.code);
            setStore(selectedStore.name);

            // Fetch Category I cooldown for this store
            try {
                const lastDate = await getLastCategoryIDate(selectedStore.code);
                if (lastDate) {
                    const cooldownMs = 3 * 30 * 24 * 60 * 60 * 1000;
                    const lastTime = new Date(lastDate).getTime();
                    const now = Date.now();
                    const cooling = now - lastTime < cooldownMs;
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
        }
    };
    const [checklist, setChecklist] = useState<Map<string, ChecklistItem>>(
        new Map(),
    );
    const [bmsItems, setBmsItems] = useState<Map<string, BmsItemGroup>>(
        new Map(),
    );

    // STATE UNTUK CAMERA MODAL
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(
        null,
    );

    // STATE UNTUK PREVIEW FOTO
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // STATE UNTUK KONFIRMASI SUBMIT
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

    // STATE UNTUK LOADING SUBMIT
    const [isSubmitting, setIsSubmitting] = useState(false);

    // STATE UNTUK DRAFT DIALOG
    const [showDraftDialog, setShowDraftDialog] = useState(!!existingDraft);
    const [isRestoringDraft, setIsRestoringDraft] = useState(false);

    // CATEGORY I COOLDOWN (per-toko, di-fetch saat pilih toko)
    const [isCategoryICoolingDown, setIsCategoryICoolingDown] = useState(false);
    const [categoryIAvailableDate, setCategoryIAvailableDate] =
        useState<Date | null>(null);

    // Categories yang aktif (filter Category I jika cooldown)
    const activeCategories = checklistCategories.filter((cat) => {
        if (cat.isPreventive && isCategoryICoolingDown) return false;
        return true;
    });

    // DRAFT: Lanjutkan draft
    const handleContinueDraft = useCallback(async () => {
        if (!existingDraft) return;
        setIsRestoringDraft(true);
        try {
            // Restore store
            if (existingDraft.storeCode) {
                const s = stores.find(
                    (st) => st.code === existingDraft.storeCode,
                );
                if (s) {
                    setSelectedStoreCode(s.code);
                    setStore(s.name);
                }
            }

            // Fetch semua foto secara paralel
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

            // Semua fetch berjalan bersamaan (parallel)
            const restoredFiles = await Promise.all(
                existingDraft.items.map(fetchPhoto),
            );

            // Restore checklist items
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

            // Restore BMS estimations jika ada
            if (
                existingDraft.estimations &&
                existingDraft.estimations.length > 0
            ) {
                const restoredBms = new Map<string, BmsItemGroup>();
                for (const est of existingDraft.estimations) {
                    const checklistItem = restored.get(est.itemId);
                    if (!checklistItem) continue;

                    // Find category for this item
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
    }, [existingDraft, stores]);

    const handleCreateNew = useCallback(async () => {
        if (existingDraft) {
            await deleteDraft(existingDraft.reportNumber);
        }
        setShowDraftDialog(false);
        toast.info("Draft dihapus, mulai laporan baru");
    }, [existingDraft]);

    // AUTO-SAVE dengan debounce (hanya save jika sudah 2 detik tidak ada perubahan)
    const debouncedChecklist = useDebounce(checklist, 2000);
    const debouncedBmsItems = useDebounce(bmsItems, 2000);
    const debouncedStoreCode = useDebounce(selectedStoreCode, 2000);

    useEffect(() => {
        // Jangan auto-save jika belum ada perubahan
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

        // Build BMS estimations from current state
        const bmsEstimations: Record<
            string,
            {
                itemName: string;
                quantity: number;
                unit: string;
                price: number;
                totalPrice: number;
            }[]
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

        // Async save
        (async () => {
            const res = await saveDraft({
                storeCode: debouncedStoreCode || undefined,
                storeName: store,
                branchName: userBranchName,
                checklistItems,
                bmsEstimations,
                totalEstimation,
            });
            if (res.reportId && res.reportId !== draftReportId) {
                setDraftReportId(res.reportId);
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

    const toggleCategory = (categoryId: string) => {
        setOpenCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const updateChecklistItem = (
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
    };

    // Fungsi membuka modal kamera
    const handleOpenCamera = async (itemId: string) => {
        if (!selectedStoreCode) {
            toast.error(
                "Harap pilih toko terlebih dahulu sebelum mengambil foto",
            );
            return;
        }

        let currentDraftId = draftReportId;
        if (!currentDraftId) {
            const loadingToast = toast.loading("Mereservasi sesi laporan...");
            try {
                const res = await saveDraft({
                    storeCode: selectedStoreCode,
                    storeName: store,
                    branchName: userBranchName,
                    checklistItems: [],
                    bmsEstimations: {},
                    totalEstimation: 0,
                });
                if (res.reportId) {
                    setDraftReportId(res.reportId);
                    currentDraftId = res.reportId;
                    toast.dismiss(loadingToast);
                } else {
                    toast.error("Gagal membuat sesi laporan, coba lagi", {
                        id: loadingToast,
                    });
                    return;
                }
            } catch {
                toast.error("Gagal membuat sesi laporan", { id: loadingToast });
                return;
            }
        }

        setActivePhotoItemId(itemId);
        setIsCameraOpen(true);
    };

    // Callback saat foto diambil dari modal
    const handlePhotoCaptured = async (file: File) => {
        if (!activePhotoItemId || !draftReportId || !selectedStoreCode) {
            toast.error("Sesi tidak valid untuk unggah foto");
            return;
        }

        let itemName = "";
        for (const cat of checklistCategories) {
            const found = cat.items.find((i) => i.id === activePhotoItemId);
            if (found) {
                itemName = found.name;
                break;
            }
        }

        const uploadingToastId = toast.loading("Mengunggah foto...");

        try {
            // Kompresi image sebelum upload
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.1,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
            });

            const fileExt = file.name.split(".").pop() || "jpg";
            // Sanitize item name for URL/File system safety
            const safeItemName = itemName
                .replace(/[^a-zA-Z0-9]/g, "_")
                .toLowerCase();
            const filePath = `${userBranchName}/${selectedStoreCode}/${draftReportId}/${activePhotoItemId}_${safeItemName}.${fileExt}`;

            const { data: uploadData, error: uploadError } =
                await supabase.storage
                    .from("reports")
                    .upload(filePath, compressedFile, {
                        upsert: true,
                    });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("reports").getPublicUrl(uploadData.path);

            setChecklist((prev) => {
                const next = new Map(prev);
                const existing = next.get(activePhotoItemId!) || {
                    id: activePhotoItemId!,
                    name: itemName,
                    condition: "" as ChecklistCondition,
                    handler: "",
                };
                next.set(activePhotoItemId!, {
                    ...existing,
                    photo: compressedFile, // Tahan File untuk context preview di memori
                    photoUrl: publicUrl, // URL Supabase langsung yang akan tersimpan di draft JSON
                });
                return next;
            });
            toast.success("Foto berhasil diunggah", { id: uploadingToastId });
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Gagal unggah foto ke server", {
                id: uploadingToastId,
            });
        }

        setActivePhotoItemId(null);
    };

    const removePhoto = async (itemId: string) => {
        const item = checklist.get(itemId);
        if (!item) return;

        const photoUrl = item.photoUrl;

        // Kosongkan dari UI segera (optimistic UI)
        setChecklist((prev) => {
            const next = new Map(prev);
            const existing = next.get(itemId);
            if (existing) {
                next.set(itemId, {
                    ...existing,
                    photo: undefined,
                    photoUrl: undefined,
                });
            }
            return next;
        });

        // Hapus dari Supabase Storage jika URL-nya adalah Supabase URL
        if (photoUrl && photoUrl.includes("supabase.co")) {
            try {
                const urlObj = new URL(photoUrl);
                // Ekstrak path setelah "/reports/"
                const pathParts = urlObj.pathname.split("/reports/")[1];
                if (pathParts) {
                    await supabase.storage
                        .from("reports")
                        .remove([decodeURIComponent(pathParts)]);
                }
            } catch (e) {
                console.error("Gagal menghapus foto dari storage", e);
            }
        }
    };

    // Fungsi untuk preview foto
    const handlePreviewPhoto = (file: File) => {
        const url = URL.createObjectURL(file);
        setPreviewPhoto(url);
    };

    const closePreview = () => {
        if (previewPhoto) {
            URL.revokeObjectURL(previewPhoto);
        }
        setPreviewPhoto(null);
    };

    // DEVELOPMENT ONLY: Auto-fill semua field (Step 1)
    const autoFillForDevelopment = async () => {
        // Open all categories
        const allCategoryIds = checklistCategories.map((cat) => cat.id);
        setOpenCategories(new Set(allCategoryIds));

        // URL gambar dummy untuk semua item
        const DUMMY_IMAGE_URL =
            "https://placehold.co/640x480/10B981/white?text=Dev+Photo";

        // Fetch once, reuse the blob for all items
        let dummyFileBlob: Blob | null = null;
        try {
            const res = await fetch(DUMMY_IMAGE_URL);
            dummyFileBlob = await res.blob();
        } catch {
            console.warn("Gagal fetch dummy image, foto tidak akan diisi");
        }

        // Fill checklist items
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
                    condition: condition,
                    handler: "",
                };

                // Attach dummy photo from URL
                if (
                    dummyFileBlob &&
                    (condition === "baik" || condition === "rusak")
                ) {
                    checklistItem.photo = new File(
                        [dummyFileBlob],
                        `foto_${item.id}.jpg`,
                        { type: "image/jpeg" },
                    );
                }

                // If rusak, add handler
                if (condition === "rusak") {
                    checklistItem.handler =
                        itemIndex % 2 === 0 ? "BMS" : "Rekanan";
                }

                newChecklist.set(item.id, checklistItem);
            }
        }

        setChecklist(newChecklist);
        toast.success("Form Step 1 berhasil diisi otomatis!");
    };

    const autoFillSummaryForDevelopment = () => {
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
            // Find category for this item
            let categoryData: ChecklistCategory | undefined;
            for (const cat of checklistCategories) {
                if (
                    cat.items.some((i) => i.id === itemGroup.checklistItem.id)
                ) {
                    categoryData = cat;
                    break;
                }
            }

            if (!categoryData) continue;

            // Tambahkan 2-3 entries untuk setiap item rusak BMS
            const entriesToAdd = Math.floor(Math.random() * 2) + 2; // 2-3 entries
            const newEntries = [...itemGroup.entries];

            for (let i = 0; i < entriesToAdd; i++) {
                const sampleItem =
                    sampleItems[Math.floor(Math.random() * sampleItems.length)];
                const unit =
                    unitOptions[Math.floor(Math.random() * unitOptions.length)];
                const quantity = Math.floor(Math.random() * 10) + 1; // 1-10
                const priceBase =
                    Math.floor(
                        (Math.random() *
                            (sampleItem.priceRange[1] -
                                sampleItem.priceRange[0])) /
                            10000,
                    ) *
                        10000 +
                    sampleItem.priceRange[0];
                const price = Math.round(priceBase / 5000) * 5000; // Round to nearest 5000

                newEntries.push({
                    id: `${itemId}-entry-${Date.now()}-${i}`,
                    categoryId: categoryData.id,
                    categoryTitle: categoryData.title,
                    itemName: sampleItem.name,
                    quantity: quantity,
                    unit: unit,
                    price: price,
                    total: quantity * price,
                });
                itemsAdded++;
            }

            newBmsItems.set(itemId, {
                ...itemGroup,
                entries: newEntries,
            });
        }

        setBmsItems(newBmsItems);
        toast.success(`${itemsAdded} barang berhasil ditambahkan!`);
    };

    const validateStep1 = (): boolean => {
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
                    }, 150); // slight delay to allow category expansion
                };

                if (!checkedItem || !checkedItem.condition) {
                    toast.error(
                        `Item "${item.name}" di kategori "${cat.title}" wajib diisi`,
                    );
                    // Expand category if closed
                    if (!openCategories.has(cat.id)) {
                        toggleCategory(cat.id);
                    }
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

                if (checkedItem.condition === "baik") {
                    if (!checkedItem.photo) {
                        toast.error(
                            `Item "${item.name}" wajib upload foto bukti`,
                        );
                        if (!openCategories.has(cat.id)) toggleCategory(cat.id);
                        scrollToItem();
                        return false;
                    }
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
    };

    const handleNextStep = () => {
        if (!validateStep1()) return;

        // Create BMS items map — preserve existing entries from restored draft
        const bmsMap = new Map<string, BmsItemGroup>();

        for (const [id, item] of checklist) {
            if (item.condition === "rusak" && item.handler === "BMS") {
                // Find category for this item
                let categoryData: ChecklistCategory | undefined;
                for (const cat of checklistCategories) {
                    if (cat.items.some((i) => i.id === id)) {
                        categoryData = cat;
                        break;
                    }
                }

                if (categoryData) {
                    // Preserve existing entries if already restored from draft
                    const existingGroup = bmsItems.get(id);
                    bmsMap.set(id, {
                        checklistItem: item,
                        categoryTitle: categoryData.title,
                        entries: existingGroup?.entries ?? [],
                    });
                }
            }
        }

        setBmsItems(bmsMap);
        setStep(2);
        window.scrollTo(0, 0);
    };

    const addBmsEntry = (itemId: string) => {
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
                // Create new array instead of mutating
                const updatedItemGroup = {
                    ...itemGroup,
                    entries: [...itemGroup.entries, newEntry],
                };
                next.set(itemId, updatedItemGroup);
            }
            return next;
        });
    };

    const updateBmsEntry = (
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
                    // Create new array with updated entry
                    const updatedEntries = [...itemGroup.entries];
                    updatedEntries[entryIndex] = updated;
                    const updatedItemGroup = {
                        ...itemGroup,
                        entries: updatedEntries,
                    };
                    next.set(itemId, updatedItemGroup);
                }
            }
            return next;
        });
    };

    const removeBmsEntry = (itemId: string, entryId: string) => {
        setBmsItems((prev) => {
            const next = new Map(prev);
            const itemGroup = next.get(itemId);
            if (itemGroup) {
                // Create new array without the removed entry
                const updatedItemGroup = {
                    ...itemGroup,
                    entries: itemGroup.entries.filter((e) => e.id !== entryId),
                };
                next.set(itemId, updatedItemGroup);
            }
            return next;
        });
    };

    const validateStep2 = (): boolean => {
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
                if (entry.price <= 0) {
                    toast.error(`Harga untuk "${entry.itemName}" wajib diisi`);
                    scrollToBmsEntry(entry.id);
                    return false;
                }
            }
        }
        return true;
    };

    const rusakItems = Array.from(checklist.values()).filter(
        (i) => i.condition === "rusak",
    );
    const bmsItemsList = rusakItems.filter((i) => i.handler === "BMS");
    const rekananItems = rusakItems.filter((i) => i.handler === "Rekanan");
    const grandTotalBms = Array.from(bmsItems.values()).reduce(
        (sum, item) => sum + item.entries.reduce((s, e) => s + e.total, 0),
        0,
    );

    // Fungsi untuk membuat DraftData dari state saat ini
    const buildDraftData = useCallback((): DraftData => {
        // Create Set of valid item IDs from active categories
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

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        setIsSubmitting(true);
        setIsSubmitDialogOpen(false);

        try {
            const draftData = buildDraftData();

            // 1. Get or Generate reportNumber by saving draft first
            const saveResult = await saveDraft(draftData);
            if (saveResult.error) {
                throw new Error(saveResult.error);
            }
            const reportNumber = saveResult.reportId;
            if (!reportNumber) throw new Error("Gagal memperoleh ID Laporan");

            // Karena foto sekarang sudah langsung di-"upload" pada saat onClick "Ambil Foto",
            // kita tidak perlu lagi convert Base64 ke Blob di handleSubmit.
            // Draft data sudah memegang `photoUrl` berisi URL Supabase.
            const updatedChecklistItems = [...draftData.checklistItems];
            for (const item of updatedChecklistItems) {
                const checkedItem = checklist.get(item.itemId);
                if (checkedItem && checkedItem.photoUrl) {
                    item.photoUrl = checkedItem.photoUrl;
                }
            }

            const finalDraftData = {
                ...draftData,
                checklistItems: updatedChecklistItems,
            };

            const result = await submitReport(finalDraftData);

            if (result.error) {
                toast.error(result.error);
                setIsSubmitting(false);
                return;
            }

            toast.success("Laporan berhasil dibuat!");
            router.push("/reports");
        } catch (err) {
            const error = err as Error;
            setIsSubmitting(false);
            toast.error("Gagal membuat laporan", {
                description:
                    error.message ||
                    "Terjadi kesalahan saat membuat laporan. Silakan coba lagi.",
            });
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* DRAFT DIALOG */}
            <DraftDialog
                open={showDraftDialog}
                draftReportNumber={existingDraft?.reportNumber || ""}
                draftStoreName={existingDraft?.storeName}
                draftUpdatedAt={existingDraft?.updatedAt || ""}
                isLoading={isRestoringDraft}
                onContinueDraft={handleContinueDraft}
                onCreateNew={handleCreateNew}
            />

            {/* PILIH TOKO DIALOG */}
            <StoreSelectDialog
                open={!selectedStoreCode && !showDraftDialog}
                stores={stores}
                selectedStoreCode={selectedStoreCode}
                onStoreChange={handleStoreChange}
                onCancel={() => router.push("/dashboard")}
            />

            <LoadingOverlay
                isOpen={isSubmitting}
                message="Membuat laporan..."
            />

            <Header
                variant="dashboard"
                title={
                    step === 1
                        ? "Checklist Perbaikan Toko"
                        : "Ringkasan Laporan"
                }
                showBackButton={step === 1}
                backHref="/dashboard"
                logo={false}
            />

            {/* MODAL KAMERA FULLSCREEN */}
            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handlePhotoCaptured}
                watermarkInfo={{
                    name: userInfo.name,
                    nik: userInfo.nik,
                    role: userInfo.role,
                    storeInfo: `Toko: ${store || "Belum Dipilih"}${draftReportId ? ` | ${draftReportId}` : ""}`,
                }}
            />

            {/* MODAL PREVIEW FOTO */}
            <PhotoPreviewOverlay
                previewPhoto={previewPhoto}
                onClose={closePreview}
            />

            <main className="flex-1 container mx-auto px-4 md:px-4 py-4 md:py-8 max-w-7xl content-wrapper">
                <ProgressBar step={step} />

                {/* DEVELOPMENT ONLY: Auto Fill Button */}
                {process.env.NODE_ENV === "development" && step === 1 && (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                            onClick={autoFillForDevelopment}
                        >
                            <Zap className="mr-2 h-4 w-4" />
                            Auto Fill (Dev Only)
                        </Button>
                    </div>
                )}
                {process.env.NODE_ENV === "development" && step === 2 && (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                            onClick={autoFillSummaryForDevelopment}
                        >
                            <Zap className="mr-2 h-4 w-4" />
                            Auto Fill (Dev Only)
                        </Button>
                    </div>
                )}

                {step === 1 ? (
                    <ChecklistStep
                        storeCode={selectedStoreCode}
                        storeName={store}
                        activeCategories={activeCategories}
                        openCategories={openCategories}
                        checklist={checklist}
                        isCategoryICoolingDown={isCategoryICoolingDown}
                        categoryIAvailableDate={categoryIAvailableDate}
                        onToggleCategory={toggleCategory}
                        onConditionChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "condition",
                                value,
                            )
                        }
                        onNotesChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "notes",
                                value,
                            )
                        }
                        onHandlerChange={(itemId, itemName, value) =>
                            updateChecklistItem(
                                itemId,
                                itemName,
                                "handler",
                                value,
                            )
                        }
                        onOpenCamera={handleOpenCamera}
                        onPreviewPhoto={handlePreviewPhoto}
                        onRemovePhoto={removePhoto}
                        onBack={() => router.back()}
                        onNext={handleNextStep}
                    />
                ) : (
                    <BmsEstimationStep
                        bmsItems={bmsItems}
                        bmsItemsList={bmsItemsList}
                        rekananItems={rekananItems}
                        grandTotalBms={grandTotalBms}
                        store={store}
                        storeCode={selectedStoreCode}
                        isSubmitDialogOpen={isSubmitDialogOpen}
                        setIsSubmitDialogOpen={setIsSubmitDialogOpen}
                        onAddBmsEntry={addBmsEntry}
                        onUpdateBmsEntry={updateBmsEntry}
                        onRemoveBmsEntry={removeBmsEntry}
                        onBack={() => setStep(1)}
                        onSubmit={handleSubmit}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}
