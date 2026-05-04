"use server";

import prisma from "@/lib/prisma";
import { ReportStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { MaterialStoreJson } from "@/types/report";

export interface StartWorkPhotoInput {
    selfieUrls: string[];
    selfieFileIds: string[];
    receiptUrls: string[];
    receiptFileIds: string[];
    materialStores: MaterialStoreJson[];
    materialStorePhotoFileIds: string[];
    /**
     * When true, selfie and receipt photos are optional.
     * Only valid when the total estimated cost is Rp 0 (tanpa biaya).
     */
    skipPhotos?: boolean;
}

/**
 * BMS starts working on an approved report, capturing selfie and nota photos.
 * Stores start-work photos and transitions status: ESTIMATION_APPROVED → IN_PROGRESS.
 * Can only be called by the BMS who owns the report.
 */
export async function startWorkWithPhotos(
    reportNumber: string,
    photos: StartWorkPhotoInput,
) {
    try {
        const user = await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: {
                createdByNIK: true,
                status: true,
                uploadthingFileKeys: true,
                drivePhotoFileIds: true,
            },
        });

        if (!report) {
            return { error: "Laporan tidak ditemukan" };
        }

        if (report.createdByNIK !== user.NIK) {
            return { error: "Anda tidak memiliki akses ke laporan ini" };
        }

        if (report.status !== ReportStatus.ESTIMATION_APPROVED) {
            return {
                error: "Laporan harus berstatus 'Estimasi Disetujui' untuk memulai pengerjaan",
            };
        }

        const validSelfieUrls = photos.selfieUrls.filter(
            (url) => url.trim().length > 0,
        );
        // Selfie only required when there is an estimated cost (photos.skipPhotos = false)
        if (!photos.skipPhotos && validSelfieUrls.length === 0) {
            return {
                error: "Foto selfie wajib diunggah sebelum memulai pengerjaan",
            };
        }

        const validReceiptUrls = photos.receiptUrls.filter(
            (url) => url.trim().length > 0,
        );
        // Receipt only required when there is an estimated cost
        if (!photos.skipPhotos && validReceiptUrls.length === 0) {
            return {
                error: "Foto nota/struk wajib diunggah sebelum memulai pengerjaan",
            };
        }

        const validMaterialStores = photos.materialStores
            .map((store) => ({
                name: store.name.trim(),
                city: store.city.trim(),
                photoUrls: Array.isArray(store.photoUrls)
                    ? store.photoUrls
                          .map((url) => url.trim())
                          .filter((url) => url.length > 0)
                    : undefined,
            }))
            .filter((store) => store.name.length > 0 && store.city.length > 0);
        // Material store only required when there is an estimated cost
        if (!photos.skipPhotos && validMaterialStores.length === 0) {
            return {
                error: "Data toko material wajib diisi sebelum memulai pengerjaan",
            };
        }

        const validStorePhotoUrls = validMaterialStores.flatMap(
            (store) => store.photoUrls ?? [],
        );
        if (!photos.skipPhotos && validStorePhotoUrls.length === 0) {
            return {
                error: "Foto toko material wajib diunggah sebelum memulai pengerjaan",
            };
        }

        // Store selfie URLs as plain URL (single) or JSON array (multiple).
        const selfieUrlValue =
            validSelfieUrls.length === 1
                ? validSelfieUrls[0]
                : JSON.stringify(validSelfieUrls);

        // Collect all UploadThing file keys for future cleanup (legacy)
        const existingKeys = Array.isArray(report.uploadthingFileKeys)
            ? (report.uploadthingFileKeys as string[])
            : [];
        const newKeys = [...existingKeys];

        // Collect all Google Drive CDN file IDs for future cleanup
        const existingFileIds = Array.isArray(report.drivePhotoFileIds)
            ? (report.drivePhotoFileIds as string[])
            : [];
        const newFileIds = [
            ...existingFileIds,
            ...photos.selfieFileIds.filter((id) => id.trim().length > 0),
            ...photos.receiptFileIds.filter((id) => id.trim().length > 0),
            ...photos.materialStorePhotoFileIds.filter(
                (id) => id.trim().length > 0,
            ),
        ];

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: {
                    status: ReportStatus.IN_PROGRESS,
                    startSelfieUrl: selfieUrlValue || null,
                    startReceiptUrls:
                        validReceiptUrls as unknown as Prisma.InputJsonValue,
                    startMaterialStores:
                        validMaterialStores as unknown as Prisma.InputJsonValue,
                    // Keep existing UploadThing keys (legacy)
                    uploadthingFileKeys:
                        newKeys as unknown as Prisma.InputJsonValue,
                    // Append new Drive file IDs
                    drivePhotoFileIds:
                        newFileIds as unknown as Prisma.InputJsonValue,
                },
            }),
            prisma.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: "WORK_STARTED",
                    notes: null,
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");

        logger.info(
            {
                operation: "startWorkWithPhotos",
                reportNumber,
                userId: user.NIK,
            },
            "BMS started work with photos",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "startWorkWithPhotos", reportNumber },
            "Failed to start work with photos",
            error,
        );
        return {
            error: "Gagal memulai pengerjaan",
            detail: getErrorDetail(error),
        };
    }
}
