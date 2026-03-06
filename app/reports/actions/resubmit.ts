"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import type { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";
import {
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
// import { sendReportNotification } from "@/lib/email/send-report-notification"; // TODO: Re-enable when ready
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";

function buildItemsJson(data: DraftData): Prisma.InputJsonValue {
    return data.checklistItems
        .filter((item) => item.condition || item.preventiveCondition)
        .map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName,
            condition: item.condition || null,
            preventiveCondition: item.preventiveCondition || null,
            handler: item.handler || null,
            photoUrl: item.photoUrl || null,
            notes: item.notes || null,
        })) as unknown as Prisma.InputJsonValue;
}

function buildEstimationsJson(data: DraftData): Prisma.InputJsonValue {
    const estimations: MaterialEstimationJson[] = [];
    for (const [itemId, ests] of Object.entries(data.bmsEstimations)) {
        for (const est of ests) {
            estimations.push({
                itemId,
                materialName: est.itemName,
                quantity: est.quantity,
                unit: est.unit,
                price: est.price,
                totalPrice: est.totalPrice,
            });
        }
    }
    return estimations as unknown as Prisma.InputJsonValue;
}

/**
 * Resubmit a REJECTED report after revision.
 * Updates the report content and sets status back to PENDING_APPROVAL.
 */
export async function resubmitReport(reportNumber: string, data: DraftData) {
    const parsed = draftDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data laporan tidak valid",
            detail: parsed.error.message,
        };
    }

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

        const REVISION_STATUSES = [
            "ESTIMATION_REJECTED_REVISION",
            "REVIEW_REJECTED_REVISION",
        ] as const;
        type RevisionStatus = (typeof REVISION_STATUSES)[number];

        if (!(REVISION_STATUSES as readonly string[]).includes(report.status)) {
            return {
                error: "Hanya laporan dengan status revisi yang bisa diajukan ulang",
            };
        }

        const currentStatus = report.status as RevisionStatus;
        const newStatus =
            currentStatus === "REVIEW_REJECTED_REVISION"
                ? "PENDING_REVIEW"
                : "PENDING_ESTIMATION";

        await requireOwnership(report.createdByNIK);

        const itemsJson = buildItemsJson(data);
        const estimationsJson = buildEstimationsJson(data);

        await prisma.$transaction(async (tx) => {
            // Delete the rejection log entry before resubmitting
            await tx.approvalLog.deleteMany({
                where: { reportNumber, status: currentStatus },
            });

            await tx.report.update({
                where: { reportNumber },
                data: {
                    storeCode: data.storeCode || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: newStatus,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            const activityAction =
                currentStatus === "REVIEW_REJECTED_REVISION"
                    ? "RESUBMITTED_WORK"
                    : "RESUBMITTED_ESTIMATION";

            await tx.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: activityAction,
                    notes: null,
                },
            });
        });

        revalidatePath("/reports");
        revalidatePath(`/reports/${reportNumber}`);

        // TODO: Re-enable email when ready
        // sendReportNotification(reportNumber).catch((err) => {
        //     logger.error(
        //         { operation: "resubmitReport", reportNumber },
        //         "Failed to send notification email",
        //         err,
        //     );
        // });

        return { success: true, reportId: reportNumber };
    } catch (error) {
        logger.error(
            { operation: "resubmitReport", reportNumber },
            "Failed to resubmit report",
            error,
        );
        return {
            error: "Gagal mengajukan ulang laporan",
            detail: getErrorDetail(error),
        };
    }
}
