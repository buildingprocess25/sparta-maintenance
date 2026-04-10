import "server-only";

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requireAuth } from "@/lib/authorization";

const f = createUploadthing();

/**
 * Auth middleware shared across all upload routes.
 * Throws UploadThingError if the user is not authenticated.
 */
async function authMiddleware() {
    try {
        const user = await requireAuth();
        return { userId: user.NIK };
    } catch {
        throw new UploadThingError("Unauthorized");
    }
}

export const ourFileRouter = {
    /**
     * Foto checklist item saat membuat / mengedit laporan (draft).
     * Satu foto per item, ukuran maks 4 MB.
     */
    checklistPhotoUploader: f({
        image: { maxFileSize: "4MB", maxFileCount: 1 },
    })
        .middleware(authMiddleware)
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl, key: file.key };
        }),

    /**
     * Foto selfie dan nota/struk saat BMS memulai pengerjaan.
     * Maks 10 foto per upload (selfie + nota bisa banyak).
     */
    startWorkPhotoUploader: f({
        image: { maxFileSize: "4MB", maxFileCount: 10 },
    })
        .middleware(authMiddleware)
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl, key: file.key };
        }),

    /**
     * Foto "sesudah" per item dan dokumentasi tambahan saat completion.
     * Maks 10 foto per upload.
     */
    completionPhotoUploader: f({
        image: { maxFileSize: "4MB", maxFileCount: 10 },
    })
        .middleware(authMiddleware)
        .onUploadComplete(async ({ file }) => {
            return { url: file.ufsUrl, key: file.key };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
