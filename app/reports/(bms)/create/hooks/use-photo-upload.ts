"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";

function getImageDimensions(
    file: File,
): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
            resolve({ width: 4, height: 3 });
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
    });
}
import { saveDraft } from "@/app/reports/actions";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";

type UsePhotoUploadParams = {
    checklist: Map<string, ChecklistItem>;
    setChecklist: React.Dispatch<
        React.SetStateAction<Map<string, ChecklistItem>>
    >;
    selectedStoreCode: string;
    store: string;
    userBranchName: string;
    draftReportId: string | null;
    setDraftReportId: (id: string) => void;
};

export function usePhotoUpload({
    checklist,
    setChecklist,
    selectedStoreCode,
    store,
    userBranchName,
    draftReportId,
    setDraftReportId,
}: UsePhotoUploadParams) {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(
        null,
    );
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    const handleOpenCamera = useCallback(
        async (itemId: string) => {
            if (!selectedStoreCode) {
                toast.error(
                    "Harap pilih toko terlebih dahulu sebelum mengambil foto",
                );
                return;
            }

            let currentDraftId = draftReportId;
            if (!currentDraftId) {
                const loadingToast = toast.loading(
                    "Mereservasi sesi laporan...",
                );
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
                    toast.error("Gagal membuat sesi laporan", {
                        id: loadingToast,
                    });
                    return;
                }
            }

            setActivePhotoItemId(itemId);
            setIsCameraOpen(true);
        },
        [
            selectedStoreCode,
            store,
            userBranchName,
            draftReportId,
            setDraftReportId,
        ],
    );

    const handlePhotoCaptured = useCallback(
        async (file: File) => {
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
                const compressedFile = await imageCompression(file, {
                    maxSizeMB: 0.1,
                    maxWidthOrHeight: 1280,
                    useWebWorker: true,
                });

                const fileExt = file.name.split(".").pop() || "jpg";
                const safeItemName = itemName
                    .replace(/[^a-zA-Z0-9]/g, "_")
                    .toLowerCase();
                const { width: imgW, height: imgH } =
                    await getImageDimensions(compressedFile);
                const filePath = `${userBranchName}/${selectedStoreCode}/${draftReportId}/${activePhotoItemId}_${safeItemName}_${imgW}x${imgH}.${fileExt}`;

                const { data: uploadData, error: uploadError } =
                    await supabase.storage
                        .from("reports")
                        .upload(filePath, compressedFile, { upsert: true });

                if (uploadError) throw uploadError;

                const {
                    data: { publicUrl },
                } = supabase.storage
                    .from("reports")
                    .getPublicUrl(uploadData.path);

                const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

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
                        photo: compressedFile,
                        photoUrl: cacheBustedUrl,
                    });
                    return next;
                });
                toast.success("Foto berhasil diunggah", {
                    id: uploadingToastId,
                });
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("Gagal unggah foto ke server", {
                    id: uploadingToastId,
                });
            }

            setActivePhotoItemId(null);
        },
        [
            activePhotoItemId,
            draftReportId,
            selectedStoreCode,
            userBranchName,
            setChecklist,
        ],
    );

    const removePhoto = useCallback(
        async (itemId: string) => {
            const item = checklist.get(itemId);
            if (!item) return;

            const photoUrl = item.photoUrl;

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

            if (photoUrl && photoUrl.includes("supabase.co")) {
                try {
                    const urlObj = new URL(photoUrl);
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
        },
        [checklist, setChecklist],
    );

    const handlePreviewPhoto = useCallback((file: File) => {
        setPreviewPhoto(URL.createObjectURL(file));
    }, []);

    const _doClosePreview = useCallback(() => {
        if (previewPhoto) URL.revokeObjectURL(previewPhoto);
        setPreviewPhoto(null);
    }, [previewPhoto]);

    const closePreview = useHistoryBackClose(!!previewPhoto, _doClosePreview);

    return {
        isCameraOpen,
        setIsCameraOpen,
        previewPhoto,
        handleOpenCamera,
        handlePhotoCaptured,
        removePhoto,
        handlePreviewPhoto,
        closePreview,
    };
}
