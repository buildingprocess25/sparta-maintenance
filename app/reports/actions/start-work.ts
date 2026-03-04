"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * BMS starts working on an approved report.
 * Transitions status: APPROVED → ON_PROGRESS.
 * Can only be called by the BMS who owns the report.
 */
export async function startWork(reportNumber: string) {
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

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: { status: ReportStatus.IN_PROGRESS },
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
            { operation: "startWork", reportNumber, userId: user.NIK },
            "BMS started work on report",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "startWork", reportNumber },
            "Failed to start work",
            error,
        );
        return {
            error: "Gagal memulai pengerjaan",
            detail: getErrorDetail(error),
        };
    }
}
