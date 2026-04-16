"use client";

import imageCompression from "browser-image-compression";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export interface UploadedPhoto {
    url: string;
    key: string;
}

const COMPRESSION_OPTIONS = {
    maxSizeMB: 0.07, // Target max size in megabytes (70KB)
    maxWidthOrHeight: 1280,
    useWebWorker: true,
} as const;

type UploadEndpoint = keyof OurFileRouter;

/**
 * Compresses an image file and uploads it to UploadThing via a signed URL.
 *
 * This function is intentionally thin — it compresses and uploads a single
 * file. Batching and error handling are the caller's responsibility.
 *
 * @param file     - The raw File captured from the camera.
 * @param endpoint - The UploadThing route endpoint to use.
 * @returns The uploaded file URL and key, or null on failure.
 */
export async function compressAndUploadToUT(
    file: File,
    endpoint: UploadEndpoint,
): Promise<UploadedPhoto | null> {
    try {
        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

        const compressedFile = new File(
            [compressed],
            file.name || "photo.jpg",
            { type: compressed.type || "image/jpeg" },
        );

        const { genUploader } = await import("uploadthing/client");
        const { uploadFiles } = genUploader<OurFileRouter>();
        const [result] = await uploadFiles(endpoint, {
            files: [compressedFile],
        });

        if (!result?.url || !result?.key) return null;

        return { url: result.url, key: result.key };
    } catch (err) {
        console.error("[compressAndUploadToUT] Upload error:", err);
        return null;
    }
}

/**
 * Returns the natural dimensions of an image file.
 * Falls back to a 4:3 ratio (width=4, height=3) on error.
 */
export function getImageDimensions(
    file: File | Blob,
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

/** Generates a short, time-based unique ID. */
export function genPhotoId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
