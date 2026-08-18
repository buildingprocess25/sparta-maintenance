"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRekananZeroCost } from "@/lib/report-utils";
import { getReportStatusLabel } from "@/lib/report-status";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

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
            select: {
                status: true,
                branchName: true,
                createdByNIK: true,
                items: true,
                estimations: true,
            },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        const REVIEWABLE_STATUSES = [
            ReportStatus.PENDING_ESTIMATION,
            ReportStatus.PENDING_CHECKLIST_REVIEW,
        ] as const;
        type ReviewableStatus = (typeof REVIEWABLE_STATUSES)[number];

        if (!REVIEWABLE_STATUSES.includes(report.status as ReviewableStatus)) {
            return {
                error: `Laporan harus berstatus '${getReportStatusLabel("PENDING_ESTIMATION")}' atau '${getReportStatusLabel("PENDING_CHECKLIST_REVIEW")}'`,
            };
        }

        // BMC can only review reports from their own branches
        if (!user.branchNames.includes(report.branchName)) {
            return { error: "Laporan ini bukan dari cabang Anda" };
        }

        // Detect REKANAN zero-cost: if all damaged items are REKANAN-handled
        // with no estimation rows, bypass the normal BMS work stages and
        // transition directly to APPROVED_BMC so BNM can do the final sign-off.
        const items = (report.items ?? []) as unknown as ReportItemJson[];
        const estimations = (report.estimations ??
            []) as unknown as MaterialEstimationJson[];
            
        const isChecklistReport = report.status === ReportStatus.PENDING_CHECKLIST_REVIEW;

        // isRekananZeroCost dipertahankan sebagai safety net untuk PENDING_ESTIMATION
        const isRekananBypass =
            decision === "approve" && !isChecklistReport && isRekananZeroCost(items, estimations);

        const newStatus = isChecklistReport && decision === "approve"
            ? ReportStatus.APPROVED_BMC
            : isRekananBypass
              ? ReportStatus.APPROVED_BMC
              : decision === "approve"
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
                where: {
                    reportNumber,
                    status: { in: [ReportStatus.PENDING_ESTIMATION, ReportStatus.PENDING_CHECKLIST_REVIEW] },
                },
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

        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath(`/dashboard/reports/${reportNumber}`);
        revalidatePath("/reports");
        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard");

        const notificationType =
            decision === "approve"
                ? "REPORT_ESTIMATION_APPROVED"
                : decision === "reject_revision"
                  ? "REPORT_ESTIMATION_REJECTED_REVISION"
                  : "REPORT_ESTIMATION_REJECTED";

        dispatchNotificationEvent({
            type: notificationType,
            actorNIK: user.NIK,
            reportNumber,
            notes: logNote,
        });

        if (isRekananBypass || (isChecklistReport && decision === "approve")) {
            dispatchNotificationEvent({
                type: "REPORT_WORK_APPROVED",
                actorNIK: user.NIK,
                reportNumber,
                notes: logNote,
            });
        }

        logger.info(
            {
                operation: "reviewEstimation",
                reportNumber,
                decision,
                isChecklistReport,
                rekananBypass: isRekananBypass,
                userId: user.NIK,
            },
            isChecklistReport && decision === "approve"
                ? "Checklist approved → APPROVED_BMC"
                : isRekananBypass
                  ? "Estimation approved with REKANAN bypass → APPROVED_BMC"
                  : "Estimation reviewed",
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
