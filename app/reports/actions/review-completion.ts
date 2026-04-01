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
 * - approve         → APPROVED_BMC  (waiting BnM final review)
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
            select: { status: true, branchName: true, finishedAt: true },
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
            decision === "approve"
                ? ReportStatus.APPROVED_BMC
                : ReportStatus.REVIEW_REJECTED_REVISION;

        // For approvals, only store user-typed notes (null if empty) so the PDF
        // stamp notes strip doesn't show an auto-generated placeholder.
        const logNote =
            decision === "approve"
                ? notes || null
                : notes || "Pekerjaan ditolak oleh BMC, BMS diminta merevisi";

        const completionReviewAction =
            decision === "approve" ? "WORK_APPROVED" : "WORK_REJECTED_REVISION";

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: {
                    status: newStatus,
                    // Keep existing finishedAt from completion submission.
                    // Backfill only for legacy rows where finishedAt is still null.
                    ...(decision === "approve" &&
                        !report.finishedAt && { finishedAt: new Date() }),
                },
            }),
            prisma.approvalLog.create({
                data: {
                    reportNumber,
                    approverNIK: user.NIK,
                    status: newStatus,
                    notes: logNote,
                },
            }),
            prisma.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: completionReviewAction,
                    notes: logNote,
                },
            }),
        ]);

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");

        logger.info(
            {
                operation: "reviewCompletion",
                reportNumber,
                decision,
                userId: user.NIK,
            },
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
