"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type ReviewDecision = "approve" | "reject_revision";

/**
 * BMC reviews a PENDING_REVIEW (work completion) report.
 * - approve         → APPROVED_BMC  (forwarded to BnM Manager)
 * - reject_revision → REVIEW_REJECTED_REVISION  (BMS must redo/resubmit)
 */
export async function reviewCompletion(
    reportNumber: string,
    decision: ReviewDecision,
    notes?: string,
) {
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: { status: true, branchName: true },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        if (report.status !== ReportStatus.PENDING_REVIEW) {
            return {
                error: "Laporan harus berstatus 'Menunggu Review Penyelesaian' untuk di-review",
            };
        }

        if (!user.branchNames.includes(report.branchName)) {
            return { error: "Laporan ini bukan dari cabang Anda" };
        }

        const newStatus =
            decision === "approve" ? ReportStatus.APPROVED_BMC : ReportStatus.REVIEW_REJECTED_REVISION;

        const logNote =
            notes ||
            (decision === "approve"
                ? "Pekerjaan disetujui oleh BMC, diteruskan ke BnM Manager"
                : "Pekerjaan ditolak oleh BMC, BMS diminta merevisi");

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: { status: newStatus },
            }),
            prisma.approvalLog.create({
                data: {
                    reportNumber,
                    approverNIK: user.NIK,
                    status: newStatus,
                    notes: logNote,
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");
        revalidatePath("/approval/reports");

        logger.info(
            { operation: "reviewCompletion", reportNumber, decision, userId: user.NIK },
            "Completion reviewed",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "reviewCompletion", reportNumber },
            "Failed to review completion",
            error,
        );
        return {
            error: "Gagal memproses review penyelesaian",
            detail: getErrorDetail(error),
        };
    }
}
