"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import {
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";

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
