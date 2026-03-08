"use server";

import prisma from "@/lib/prisma";
import { ReportStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export interface StartWorkPhotoInput {
    selfieUrls: string[];
    receiptUrls: string[];
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
            select: { createdByNIK: true, status: true },
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

        // Store selfie URLs: single string or JSON array (backward compat with completionSelfieUrl pattern)
        const selfieUrlValue =
            photos.selfieUrls.length === 1
                ? photos.selfieUrls[0]
                : JSON.stringify(photos.selfieUrls);

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: {
                    status: ReportStatus.IN_PROGRESS,
                    startSelfieUrl: selfieUrlValue || null,
                    startReceiptUrls:
                        photos.receiptUrls as unknown as Prisma.InputJsonValue,
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
