"use server";

import prisma from "@/lib/prisma";
import { ReportStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type {
    ReportItemJson,
    RealisasiItemJson,
    MaterialStoreJson,
} from "@/types/report";

export interface CompletionItemInput {
    itemId: string;
    afterImages: string[];
    realisasiItems: RealisasiItemJson[];
    /** Computed sum of realisasiItems — stored for backward compat display */
    actualCost: number;
    materialStores: MaterialStoreJson[];
    receiptImages: string[];
    notes?: string;
}

export interface AdditionalCompletionDocumentationInput {
    photos: string[];
    note?: string;
}

/**
 * BMS submits completed work with photo evidence, actual costs, and store info.
 * Merges completion data into the items JSON array on the report.
 * Transitions: IN_PROGRESS | REVIEW_REJECTED_REVISION → PENDING_REVIEW
 *
 * @param selfieUrls - Array of uploaded selfie URLs; serialized as JSON in completionSelfieUrl
 */
export async function submitCompletionWork(
    reportNumber: string,
    completionItems: CompletionItemInput[],
    selfieUrls: string[],
    additionalDocumentation?: AdditionalCompletionDocumentationInput,
    notes?: string,
    completionFileKeys: string[] = [],
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
                items: true,
                startSelfieUrl: true,
                uploadthingFileKeys: true,
            },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        if (report.createdByNIK !== user.NIK) {
            return { error: "Anda tidak memiliki akses ke laporan ini" };
        }

        if (
            report.status !== ReportStatus.IN_PROGRESS &&
            report.status !== ReportStatus.REVIEW_REJECTED_REVISION
        ) {
            return {
                error: "Laporan harus dalam status 'Sedang Dikerjakan' atau 'Penyelesaian Ditolak (Revisi)' untuk mengajukan penyelesaian",
            };
        }

        // Merge completion data into existing items JSON
        const existingItems = report.items as unknown as ReportItemJson[];
        const completionMap = new Map(
            completionItems.map((ci) => [ci.itemId, ci]),
        );

        const updatedItems: ReportItemJson[] = existingItems.map((item) => {
            const completion = completionMap.get(item.itemId);
            if (!completion) return item;
            return {
                ...item,
                afterImages: completion.afterImages,
                // New structured fields
                realisasiItems: completion.realisasiItems,
                materialStores: completion.materialStores,
                completionNotes: completion.notes,
                // Backward-compat derived fields
                actualCost: completion.actualCost,
                materialStoreName: completion.materialStores[0]?.name ?? "",
                materialStoreCity: completion.materialStores[0]?.city ?? "",
                receiptImages: completion.receiptImages,
            };
        });

        const completionAction =
            report.status === ReportStatus.REVIEW_REJECTED_REVISION
                ? "RESUBMITTED_WORK"
                : "COMPLETION_SUBMITTED";

        // Keep previous start selfie when completion form doesn't send new selfies.
        const validSelfieUrls = selfieUrls.filter(
            (url) => url.trim().length > 0,
        );
        const selfieUrlValue =
            validSelfieUrls.length > 0
                ? validSelfieUrls.length === 1
                    ? validSelfieUrls[0]
                    : JSON.stringify(validSelfieUrls)
                : report.startSelfieUrl;

        // Merge existing file keys with new completion keys
        const existingKeys = Array.isArray(report.uploadthingFileKeys)
            ? (report.uploadthingFileKeys as string[])
            : [];
        const mergedKeys = [
            ...existingKeys,
            ...completionFileKeys.filter((k) => k.trim().length > 0),
        ];

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: {
                    status: ReportStatus.PENDING_REVIEW,
                    // Tanggal selesai diisi saat BMS submit penyelesaian.
                    finishedAt: new Date(),
                    items: updatedItems as unknown as Prisma.InputJsonValue,
                    startSelfieUrl: selfieUrlValue || null,
                    completionAdditionalPhotos:
                        (additionalDocumentation?.photos ??
                            []) as unknown as Prisma.InputJsonValue,
                    completionAdditionalNote:
                        additionalDocumentation?.note?.trim() || null,
                    uploadthingFileKeys:
                        mergedKeys as unknown as Prisma.InputJsonValue,
                },
            }),
            prisma.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: completionAction,
                    notes: notes || null,
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");
        revalidatePath("/reports/complete");

        logger.info(
            {
                operation: "submitCompletionWork",
                reportNumber,
                userId: user.NIK,
            },
            "Completion work submitted for review",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "submitCompletionWork", reportNumber },
            "Failed to submit completion work",
            error,
        );
        return {
            error: "Gagal mengajukan penyelesaian",
            detail: getErrorDetail(error),
        };
    }
}
