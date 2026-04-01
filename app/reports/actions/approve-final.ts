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
import { parseMaterialStores } from "@/lib/report-material-stores";

type FinalDecision = "approve" | "reject_revision";

const assetsDir = path.join(process.cwd(), "public", "assets");
let alfamartLogoBase64 = "";
let buildingLogoBase64 = "";
try {
    alfamartLogoBase64 = fs
        .readFileSync(path.join(assetsDir, "Alfamart-Emblem-small.png"))
        .toString("base64");
    buildingLogoBase64 = fs
        .readFileSync(path.join(assetsDir, "Building-Logo.png"))
        .toString("base64");
} catch {
    // PDF will still render without logo assets
}

/**
 * BNM Manager final review for completion stage.
 * - approve         -> COMPLETED
 * - reject_revision -> REVIEW_REJECTED_REVISION (notes required)
 */
export async function approveFinal(
    reportNumber: string,
    decision: FinalDecision,
    notes?: string,
) {
    try {
        const user = await requireRole("BNM_MANAGER");
        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: {
                status: true,
                branchName: true,
                finishedAt: true,
            },
        });

        if (!report) return { error: "Laporan tidak ditemukan" };

        if (report.status !== ("APPROVED_BMC" as unknown as ReportStatus)) {
            return {
                error: "Laporan harus berstatus 'Menunggu Persetujuan Final BNM' untuk diproses",
            };
        }

        if (!user.branchNames.includes(report.branchName)) {
            return { error: "Laporan ini bukan dari cabang Anda" };
        }

        if (decision === "reject_revision" && !notes?.trim()) {
            return { error: "Alasan penolakan wajib diisi" };
        }

        const newStatus =
            decision === "approve"
                ? ReportStatus.COMPLETED
                : ReportStatus.REVIEW_REJECTED_REVISION;

        const logNote =
            decision === "approve"
                ? notes?.trim() || null
                : notes?.trim() || null;

        const activityAction =
            decision === "approve"
                ? "FINAL_APPROVED_BNM"
                : "FINAL_REJECTED_REVISION_BNM";

        await prisma.$transaction([
            prisma.report.update({
                where: { reportNumber },
                data: {
                    status: newStatus,
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
                    action: activityAction as never,
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
                    const finishedAt = reportWithDetails.finishedAt
                        ? formatDate(reportWithDetails.finishedAt)
                        : undefined;

                    const stampActions = [
                        "ESTIMATION_APPROVED",
                        "ESTIMATION_REJECTED",
                        "ESTIMATION_REJECTED_REVISION",
                        "WORK_APPROVED",
                        "WORK_REJECTED_REVISION",
                        "FINAL_APPROVED_BNM",
                        "FINAL_REJECTED_REVISION_BNM",
                    ];

                    const stamps = reportWithDetails.activities
                        .filter((l) => stampActions.includes(l.action))
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
                    const startMaterialStores = parseMaterialStores(
                        reportWithDetails.startMaterialStores,
                    );

                    const rawAdditionalDocs =
                        reportWithDetails.completionAdditionalPhotos;
                    const completionAdditionalPhotos: string[] = Array.isArray(
                        rawAdditionalDocs,
                    )
                        ? (rawAdditionalDocs as string[])
                        : typeof rawAdditionalDocs === "string" &&
                            rawAdditionalDocs.startsWith("[")
                          ? (JSON.parse(rawAdditionalDocs) as string[])
                          : [];
                    const completionAdditionalNote =
                        reportWithDetails.completionAdditionalNote ?? undefined;

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
                        finishedAt,
                        items,
                        estimations,
                        totalEstimation: Number(
                            reportWithDetails.totalEstimation,
                        ),
                        alfamartLogoBase64,
                        buildingLogoBase64,
                        completionSelfieUrls,
                        startReceiptUrls,
                        startMaterialStores,
                        completionNotes,
                        completionAdditionalPhotos,
                        completionAdditionalNote,
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
                operation: "approveFinal",
                reportNumber,
                decision,
                userId: user.NIK,
            },
            "Final completion review processed",
        );

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "approveFinal", reportNumber },
            "Failed to process final completion review",
            error,
        );
        return {
            error: "Gagal memproses persetujuan final",
            detail: getErrorDetail(error),
        };
    }
}
