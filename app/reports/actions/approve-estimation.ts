"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { generateAndSaveReportSnapshot } from "@/lib/pdf/report-snapshots";

type EstimationDecision = "approve" | "reject_revision" | "reject";

/**
 * BMC reviews a PENDING_ESTIMATION report.
 * - approve         → ESTIMATION_APPROVED  (BMS can start work)
 * - reject_revision → ESTIMATION_REJECTED_REVISION  (BMS must revise and resubmit)
 * - reject          → ESTIMATION_REJECTED  (report permanently closed)
 */
export async function reviewEstimation(
    reportNumber: string,
    decision: EstimationDecision,
    notes?: string,
) {
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: { status: true, branchName: true, createdByNIK: true },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        if (report.status !== ReportStatus.PENDING_ESTIMATION) {
            return {
                error: "Laporan harus berstatus 'Menunggu Persetujuan Estimasi'",
            };
        }

        // BMC can only review reports from their own branches
        if (!user.branchNames.includes(report.branchName)) {
            return { error: "Laporan ini bukan dari cabang Anda" };
        }

        const newStatus =
            decision === "approve"
                ? ReportStatus.ESTIMATION_APPROVED
                : decision === "reject_revision"
                  ? ReportStatus.ESTIMATION_REJECTED_REVISION
                  : ReportStatus.ESTIMATION_REJECTED;

        // For approvals, only store user-typed notes (null if empty) so the PDF
        // stamp notes strip doesn't show an auto-generated placeholder.
        // For rejections, keep a fallback so BMS understands why they were rejected.
        const logNote =
            decision === "approve"
                ? notes || null
                : notes ||
                  (decision === "reject_revision"
                      ? "Estimasi ditolak, BMS diminta merevisi"
                      : "Estimasi ditolak permanen oleh BMC");

        const estimationAction =
            decision === "approve"
                ? "ESTIMATION_APPROVED"
                : decision === "reject_revision"
                  ? "ESTIMATION_REJECTED_REVISION"
                  : "ESTIMATION_REJECTED";

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
            prisma.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: estimationAction,
                    notes: logNote,
                },
            }),
        ]);

        if (decision === "approve") {
            try {
                await generateAndSaveReportSnapshot({
                    reportNumber,
                    checkpoint: "ESTIMATION_APPROVED",
                });
            } catch (snapshotError) {
                logger.warn(
                    { operation: "reviewEstimation.snapshot", reportNumber },
                    `Gagal membuat snapshot PDF ESTIMATION_APPROVED: ${getErrorDetail(snapshotError)}`,
                );
            }
        }

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath("/reports");

        logger.info(
            {
                operation: "reviewEstimation",
                reportNumber,
                decision,
                userId: user.NIK,
            },
            "Estimation reviewed",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "reviewEstimation", reportNumber },
            "Failed to review estimation",
            error,
        );
        return {
            error: "Gagal memproses review estimasi",
            detail: getErrorDetail(error),
        };
    }
}
