"use client";

import { useState } from "react";

export type PhotoUploadResult = {
    url: string;
    fileId: string;
};

/**
 * React hook for uploading photos to Google Drive CDN.
 * Replaces `compressAndUploadToUT` in all photo upload flows.
 *
 * @returns uploadPhoto function and isUploading state
 */
export function usePhotoUpload() {
    const [isUploading, setIsUploading] = useState(false);

    const uploadPhoto = async (
        file: File,
    ): Promise<PhotoUploadResult | null> => {
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/photos/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage =
                    errorData.error || `HTTP ${response.status}`;

                console.error(
                    "[usePhotoUpload] Upload failed:",
                    errorMessage,
                );

                return null;
            }

            const data = await response.json();

            if (!data.url || !data.fileId) {
                console.error(
                    "[usePhotoUpload] Invalid response format:",
                    data,
                );
                return null;
            }

            return {
                url: data.url,
                fileId: data.fileId,
            };
        } catch (error) {
            console.error("[usePhotoUpload] Upload error:", error);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadPhoto,
        isUploading,
    };
}
