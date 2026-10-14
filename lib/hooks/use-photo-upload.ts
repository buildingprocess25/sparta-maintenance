"use client";

import { useState } from "react";
import type { PhotoUploadContext } from "@/lib/google-drive/photo-upload-context";
import type { PhotoUploadOutcome } from "@/lib/photo-upload/upload-failure";
import { uploadPhotoRequest } from "@/lib/photo-upload/upload-photo-request";

/**
 * React hook for uploading photos to Google Drive CDN.
 * Returns a typed outcome so callers can show the real failure cause.
 */
export function usePhotoUpload() {
    const [isUploading, setIsUploading] = useState(false);

    const uploadPhoto = async (
        file: File,
        context: PhotoUploadContext,
    ): Promise<PhotoUploadOutcome> => {
        setIsUploading(true);
        try {
            const outcome = await uploadPhotoRequest(file, context);
            if (!outcome.ok) {
                console.error("[usePhotoUpload] Upload failed:", outcome.failure);
            }
            return outcome;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadPhoto,
        isUploading,
    };
}
