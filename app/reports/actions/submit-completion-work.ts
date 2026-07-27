"use server";

import prisma from "@/lib/prisma";
import { ReportStatus, Prisma } from "@prisma/client";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";
import { serializeStartWorkSelfieUrls } from "@/lib/report-start-work-revision";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getReportStatusLabel } from "@/lib/report-status";
import type {
    ReportItemJson,
    RealisasiItemJson,
    MaterialStoreJson,
} from "@/types/report";
import { cleanReportItemsJson } from "./report-json-helpers";
import { calculateBmsBalance, hasBmsRepairItems } from "@/lib/balance";

export interface CompletionItemInput {
    itemId: string;
    afterImages: string[];
    realisasiItems: RealisasiItemJson[];
    discountAmount?: number;
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

export interface StartWorkRevisionInput {
    selfieUrls: string[];
    selfieFileIds: string[];
    receiptUrls: string[];
    receiptFileIds: string[];
    materialStores: MaterialStoreJson[];
    materialStorePhotoFileIds: string[];
    skipPhotos?: boolean;
}

/**
 * BMS submits completed work with photo evidence, actual costs, and store info.
 * Merges completion data into the items JSON array on the report.
 * Transitions: IN_PROGRESS | REVIEW_REJECTED_REVISION → PENDING_REVIEW
 *
 * @param selfieUrls - Array of uploaded selfie URLs; serialized as JSON in completionSelfieUrl
 * @param completionFileIds - Array of Google Drive CDN file IDs for cleanup
 */
export async function submitCompletionWork(
    reportNumber: string,
    completionItems: CompletionItemInput[],
    selfieUrls: string[],
    additionalDocumentation?: AdditionalCompletionDocumentationInput,
    notes?: string,
    completionFileIds: string[] = [],
    startWorkRevision?: StartWorkRevisionInput,
    unexpectedCostNotes?: string,
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
                totalEstimation: true,
                startSelfieUrl: true,
                startReceiptUrls: true,
                startMaterialStores: true,
                drivePhotoFileIds: true,
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
                error: `Laporan harus dalam status '${getReportStatusLabel("IN_PROGRESS")}' atau '${getReportStatusLabel("REVIEW_REJECTED_REVISION")}' untuk mengajukan penyelesaian`,
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
                discountAmount: Math.max(0, completion.discountAmount ?? 0),
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
        const completionSelfieUrlValue =
            validSelfieUrls.length > 0
                ? validSelfieUrls.length === 1
                    ? validSelfieUrls[0]
                    : JSON.stringify(validSelfieUrls)
                : report.startSelfieUrl;

        const startWorkUpdate = startWorkRevision
            ? normalizeStartWorkRevision(startWorkRevision)
            : null;

        if (startWorkUpdate) {
            const totalEstimation = Number(report.totalEstimation);
            if (startWorkUpdate.skipPhotos && totalEstimation !== 0) {
                return {
                    error: "Lewati foto mulai pekerjaan hanya diperbolehkan jika total estimasi adalah Rp 0",
                };
            }

            if (!startWorkUpdate.skipPhotos) {
                if (startWorkUpdate.selfieUrls.length === 0) {
                    return {
                        error: "Foto selfie mulai pekerjaan wajib diisi",
                    };
                }

                if (startWorkUpdate.receiptUrls.length === 0) {
                    return {
                        error: "Foto nota/struk mulai pekerjaan wajib diisi",
                    };
                }

                if (startWorkUpdate.materialStores.length === 0) {
                    return {
                        error: "Data toko material mulai pekerjaan wajib diisi",
                    };
                }

                const storePhotoUrls = startWorkUpdate.materialStores.flatMap(
                    (store) => store.photoUrls ?? [],
                );
                if (storePhotoUrls.length === 0) {
                    return {
                        error: "Foto toko material mulai pekerjaan wajib diisi",
                    };
                }
            }
        }

        // Merge existing Drive file IDs with new completion file IDs
        const existingFileIds = Array.isArray(report.drivePhotoFileIds)
            ? (report.drivePhotoFileIds as string[])
            : [];
        const mergedFileIds = [
            ...existingFileIds,
            ...completionFileIds.filter((id) => id.trim().length > 0),
            ...(startWorkUpdate?.fileIds ?? []),
        ];

        const totalReal = calculateTotalRealisasiFromItems(updatedItems);

        // ── Realisasi Over Estimation Check ──────────────────────────────────────────
        const hasBalanceImpact = hasBmsRepairItems(updatedItems);
        if (hasBalanceImpact) {
            const balance = await calculateBmsBalance(user.NIK);
            if (totalReal > balance.availableBalance) {
                // Realisasi melebihi sisa saldo — wajib isi catatan biaya tak terduga
                const safeCostNotes = unexpectedCostNotes?.trim();
                if (!safeCostNotes) {
                    return {
                        error:
                            "Realisasi biaya melebihi sisa saldo. Catatan Biaya Tak Terduga wajib diisi untuk melanjutkan.",
                    };
                }
            }
        }

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber, status: report.status },
                data: {
                    status: ReportStatus.PENDING_REVIEW,
                    totalReal: new Prisma.Decimal(totalReal),
                    items: cleanReportItemsJson(updatedItems),
                    startSelfieUrl: startWorkUpdate
                        ? serializeStartWorkSelfieUrls(
                              startWorkUpdate.selfieUrls,
                          )
                        : completionSelfieUrlValue || null,
                    ...(startWorkUpdate
                        ? {
                              startReceiptUrls:
                                  startWorkUpdate.receiptUrls as unknown as Prisma.InputJsonValue,
                              startMaterialStores:
                                  startWorkUpdate.materialStores as unknown as Prisma.InputJsonValue,
                          }
                        : {}),
                    completionAdditionalPhotos:
                        (additionalDocumentation?.photos ??
                            []) as unknown as Prisma.InputJsonValue,
                    completionAdditionalNote:
                        additionalDocumentation?.note?.trim() || null,
                    unexpectedCostNotes: unexpectedCostNotes?.trim() || null,
                    // Append new Drive file IDs
                    drivePhotoFileIds:
                        mergedFileIds as unknown as Prisma.InputJsonValue,
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
        revalidatePath(`/reports/${reportNumber}/completion`);
        revalidatePath("/reports");

        dispatchNotificationEvent({
            type: "REPORT_COMPLETION_SUBMITTED",
            actorNIK: user.NIK,
            reportNumber,
            notes,
        });

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

function normalizeStartWorkRevision(input: StartWorkRevisionInput) {
    const selfieUrls = cleanStringArray(input.selfieUrls);
    const receiptUrls = cleanStringArray(input.receiptUrls);
    const materialStores = input.materialStores
        .map((store) => ({
            name: store.name.trim(),
            city: store.city.trim(),
            photoUrls: cleanStringArray(store.photoUrls ?? []),
        }))
        .filter((store) => store.name.length > 0 && store.city.length > 0);

    return {
        selfieUrls,
        receiptUrls,
        materialStores,
        skipPhotos: input.skipPhotos === true,
        fileIds: [
            ...cleanStringArray(input.selfieFileIds),
            ...cleanStringArray(input.receiptFileIds),
            ...cleanStringArray(input.materialStorePhotoFileIds),
        ],
    };
}

function cleanStringArray(values: string[]): string[] {
    return values.map((value) => value.trim()).filter((value) => value.length > 0);
}
