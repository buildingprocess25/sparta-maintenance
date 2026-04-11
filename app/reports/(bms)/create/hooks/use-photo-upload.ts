"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { useHistoryBackClose } from "@/lib/hooks/use-history-back-close";
import { discardLocalDraftFiles } from "@/app/reports/actions";
import {
    checklistCategories,
    type ChecklistItem,
    type ChecklistCondition,
} from "@/lib/checklist-data";

// 1. IMPORT UPLOADTHING DI SINI
import { useUploadThing } from "@/lib/uploadthing";

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

    // 2. PANGGIL HOOK UPLOADTHING
    const { startUpload } = useUploadThing("checklistPhotoUploader");

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
                    maxSizeMB: 0.15,
                    maxWidthOrHeight: 1280,
                    useWebWorker: true,
                });

                const fileExt = file.name.split(".").pop() || "jpg";
                const safeItemName = itemName
                    .replace(/[^a-zA-Z0-9]/g, "_")
                    .toLowerCase();
                const { width: imgW, height: imgH } =
                    await getImageDimensions(compressedFile);

                // 3. LOGIKA BARU UNTUK UPLOADTHING
                const finalFileName = `${activePhotoItemId}_${safeItemName}_${imgW}x${imgH}.${fileExt}`;
                const finalFile = new File([compressedFile], finalFileName, {
                    type: compressedFile.type,
                });

                // Hapus foto yang sudah ada sebelumnya (jika ada) di server agar tidak jadi sampah
                const existingItemForCleanup = checklist.get(activePhotoItemId!);
                if (existingItemForCleanup?.photoKey) {
                    discardLocalDraftFiles([existingItemForCleanup.photoKey]).catch(e => {
                        console.error("Gagal menghapus foto lama dari server:", e);
                    });
                }

                const uploadResponse = await startUpload([finalFile]);

                if (!uploadResponse || uploadResponse.length === 0) {
                    throw new Error("Tidak mendapat balasan URL dari peladen");
                }

                const fileUrl = uploadResponse[0].url;
                const fileKey = uploadResponse[0].key; // Ambil key dari response UploadThing

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
                        photoUrl: fileUrl, // Menyimpan URL UploadThing
                        photoKey: fileKey, // Menyimpan Key UploadThing untuk cleanup lokal
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
            startUpload,
        ],
    );

    const removePhoto = useCallback(
        async (itemId: string) => {
            const item = checklist.get(itemId);
            if (!item) return;

            // Logika hapus foto dari server UploadThing (agar tidak orphan)
            if (item.photoKey) {
                discardLocalDraftFiles([item.photoKey]).catch((e) => {
                     console.error("Gagal menghapus foto dari server:", e);
                });
            }

            // Kita menghapus foto dari tampilan UI klien
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
