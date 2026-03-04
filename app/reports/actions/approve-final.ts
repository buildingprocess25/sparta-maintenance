"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * BnM Manager gives final approval on a report approved by BMC.
 * Transitions: APPROVED_BMC → COMPLETED
 */
export async function approveFinal(reportNumber: string, notes?: string) {
    try {
        const user = await requireRole("BNM_MANAGER");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: { status: true },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        if (report.status !== ReportStatus.APPROVED_BMC) {
            return {
                error: "Laporan harus berstatus 'Penyelesaian Disetujui' untuk persetujuan akhir",
            };
        }

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: { status: ReportStatus.COMPLETED },
            }),
            prisma.approvalLog.create({
                data: {
                    reportNumber,
                    approverNIK: user.NIK,
                    status: ReportStatus.COMPLETED,
                    notes: notes || null,
                },
            }),
            prisma.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: "FINALIZED",
                    notes: notes || null,
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");

        logger.info(
            { operation: "approveFinal", reportNumber, userId: user.NIK },
            "Report finalized by BnM Manager",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "approveFinal", reportNumber },
            "Failed to finalize report",
            error,
        );
        return {
            error: "Gagal memberikan persetujuan akhir",
            detail: getErrorDetail(error),
        };
    }
}
