"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { generateReportPdf } from "@/lib/pdf/generate-report-pdf";
import { uploadCompletedReportToDrive } from "@/lib/google-drive/archive";

type ReviewDecision = "approve" | "reject_revision";

const _assetsDir = path.join(process.cwd(), "public", "assets");
let ALFAMART_LOGO_BASE64 = "";
let BUILDING_LOGO_BASE64 = "";
try {
    ALFAMART_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Alfamart-Emblem-small.png"))
        .toString("base64");
    BUILDING_LOGO_BASE64 = fs
        .readFileSync(path.join(_assetsDir, "Building-Logo.png"))
        .toString("base64");
} catch {
    // PDF still renders without logo assets
}

/**
 * BMC reviews a PENDING_REVIEW (work completion) report.
 * - approve         → COMPLETED  (report finished)
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
            decision === "approve"
                ? ReportStatus.COMPLETED
                : ReportStatus.REVIEW_REJECTED_REVISION;

        // For approvals, only store user-typed notes (null if empty) so the PDF
        // stamp notes strip doesn't show an auto-generated placeholder.
        const logNote =
            decision === "approve"
                ? notes || null
                : notes || "Pekerjaan ditolak oleh BMC, BMS diminta merevisi";

        const completionReviewAction =
            decision === "approve" ? "FINALIZED" : "WORK_REJECTED_REVISION";

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
                    action: completionReviewAction,
                    notes: logNote,
                },
            }),
        ]);

        if (decision === "approve") {
            try {
                const reportWithDetails = await prisma.report.findUnique({
                    where: { reportNumber },
                    include: {
                        createdBy: { select: { name: true } },
                        store: { select: { name: true, code: true } },
                        activities: {
                            orderBy: { createdAt: "asc" },
                            include: {
                                actor: {
                                    select: {
                                        name: true,
                                        NIK: true,
                                        role: true,
                                    },
                                },
                            },
                        },
                    },
                });

                if (reportWithDetails) {
                    const items = (reportWithDetails.items ??
                        []) as unknown as ReportItemJson[];
                    const estimations = (reportWithDetails.estimations ??
                        []) as unknown as MaterialEstimationJson[];

                    const formatDate = (d: Date) =>
                        d.toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                    const submittedAt = formatDate(reportWithDetails.createdAt);

                    const STAMP_ACTIONS = [
                        "ESTIMATION_APPROVED",
                        "ESTIMATION_REJECTED",
                        "ESTIMATION_REJECTED_REVISION",
                        "WORK_APPROVED",
                        "WORK_REJECTED_REVISION",
                        "FINALIZED",
                    ];

                    const stamps = reportWithDetails.activities
                        .filter((l) => STAMP_ACTIONS.includes(l.action))
                        .map((log) => ({
                            action: log.action,
                            approverName: log.actor?.name ?? undefined,
                            approverNIK: log.actor?.NIK ?? undefined,
                            approverRole: log.actor?.role ?? undefined,
                            approvedAt: formatDate(log.createdAt),
                            notes: log.notes ?? undefined,
                        }));

                    const rawSelfie = reportWithDetails.startSelfieUrl;
                    const completionSelfieUrls: string[] = rawSelfie
                        ? rawSelfie.startsWith("[")
                            ? (JSON.parse(rawSelfie) as string[])
                            : [rawSelfie]
                        : [];

                    const rawReceipts = reportWithDetails.startReceiptUrls;
                    const startReceiptUrls: string[] = Array.isArray(
                        rawReceipts,
                    )
                        ? (rawReceipts as string[])
                        : typeof rawReceipts === "string" &&
                            (rawReceipts as string).startsWith("[")
                          ? (JSON.parse(rawReceipts as string) as string[])
                          : [];

                    const completionLog = reportWithDetails.activities.find(
                        (l) =>
                            l.action === "COMPLETION_SUBMITTED" ||
                            l.action === "RESUBMITTED_WORK",
                    );
                    const completionNotes = completionLog?.notes ?? undefined;

                    const pdfBuffer = await generateReportPdf({
                        reportNumber: reportWithDetails.reportNumber,
                        storeName: reportWithDetails.store
                            ? reportWithDetails.store.name
                            : reportWithDetails.storeName,
                        storeCode: reportWithDetails.store
                            ? reportWithDetails.store.code
                            : "-",
                        branchName: reportWithDetails.branchName,
                        submittedBy: reportWithDetails.createdBy.name,
                        submittedByNIK: reportWithDetails.createdByNIK,
                        submittedAt,
                        items,
                        estimations,
                        totalEstimation: Number(
                            reportWithDetails.totalEstimation,
                        ),
                        alfamartLogoBase64: ALFAMART_LOGO_BASE64,
                        buildingLogoBase64: BUILDING_LOGO_BASE64,
                        completionSelfieUrls,
                        startReceiptUrls,
                        completionNotes,
                        approval: {
                            reportStatus: reportWithDetails.status,
                            stamps,
                        },
                    });

                    await uploadCompletedReportToDrive({
                        branchName: reportWithDetails.branchName,
                        bmsNIK: reportWithDetails.createdByNIK,
                        bmsName: reportWithDetails.createdBy.name,
                        storeCode: reportWithDetails.storeCode,
                        storeName: reportWithDetails.storeName,
                        reportNumber: reportWithDetails.reportNumber,
                        pdfBuffer,
                    });
                }
            } catch (archiveError) {
                logger.warn(
                    { operation: "archiveCompletedReport", reportNumber },
                    `Gagal upload arsip Google Drive: ${getErrorDetail(archiveError)}`,
                );
            }
        }

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
