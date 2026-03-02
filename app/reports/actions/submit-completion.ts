"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * BMS submits a completed work for BMC review.
 * Transitions: IN_PROGRESS → PENDING_REVIEW
 * Also handles: REVIEW_REJECTED_REVISION → PENDING_REVIEW (re-submit after BMC rejection)
 */
export async function submitCompletion(reportNumber: string, notes?: string) {
    try {
        const user = await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: { createdByNIK: true, status: true },
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
                error: "Laporan harus dalam status 'Sedang Dikerjakan' atau 'Ditolak (Revisi)' untuk mengajukan penyelesaian",
            };
        }

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: { status: ReportStatus.PENDING_REVIEW },
            }),
            prisma.approvalLog.create({
                data: {
                    reportNumber,
                    approverNIK: user.NIK,
                    status: ReportStatus.PENDING_REVIEW,
                    notes: notes || "BMS mengajukan penyelesaian pekerjaan untuk di-review",
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");

        logger.info(
            { operation: "submitCompletion", reportNumber, userId: user.NIK },
            "Completion submitted for review",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "submitCompletion", reportNumber },
            "Failed to submit completion",
            error,
        );
        return {
            error: "Gagal mengajukan penyelesaian",
            detail: getErrorDetail(error),
        };
    }
}
