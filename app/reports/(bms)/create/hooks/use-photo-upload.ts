"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";
import { saveDraftPhoto, deleteDraftPhoto } from "./draft-photo-storage";

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
            if (!activePhotoItemId || !selectedStoreCode) {
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
                    maxSizeMB: 0.07, // Target max size in megabytes (70KB)
                    maxWidthOrHeight: 1280,
                    useWebWorker: true,
                });

                const fileExt = file.name.split(".").pop() || "jpg";
                const safeItemName = itemName
                    .replace(/[^a-zA-Z0-9]/g, "_")
                    .toLowerCase();
                const { width: imgW, height: imgH } =
                    await getImageDimensions(compressedFile);

                // Upload to Google Drive CDN via custom API
                const finalFileName = `${activePhotoItemId}_${safeItemName}_${imgW}x${imgH}.${fileExt}`;
                const finalFile = new File([compressedFile], finalFileName, {
                    type: compressedFile.type,
                });

                const formData = new FormData();
                formData.append("file", finalFile);

                const response = await fetch("/api/photos/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error || `HTTP ${response.status}`,
                    );
                }

                const data = await response.json();

                if (!data.url || !data.fileId) {
                    throw new Error("Invalid response format from server");
                }

                try {
                    await saveDraftPhoto(activePhotoItemId, finalFile);
                } catch (storageError) {
                    console.warn("Gagal menyimpan foto draft", storageError);
                }

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
                        photoUrl: data.url, // Google Drive CDN URL
                        photoKey: data.fileId, // Google Drive file ID
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
        [activePhotoItemId, selectedStoreCode, setChecklist],
    );

    const removePhoto = useCallback(
        async (itemId: string) => {
            const item = checklist.get(itemId);
            if (!item) return;

            // Remove photo from UI (Google Drive file will be cleaned up by cron job if report is approved)
            setChecklist((prev) => {
                const next = new Map(prev);
                const existing = next.get(itemId);
                if (existing) {
                    next.set(itemId, {
                        ...existing,
                        photo: undefined,
                        photoUrl: undefined,
                        photoKey: undefined,
                    });
                }
                return next;
            });
            deleteDraftPhoto(itemId).catch((error) => {
                console.warn("Gagal menghapus foto draft", error);
            });
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
