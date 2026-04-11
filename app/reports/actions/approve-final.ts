"use server";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { generateAndSaveReportSnapshot } from "@/lib/pdf/report-snapshots";

type FinalDecision = "approve" | "reject_revision";

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
                storeCode: true,
                storeName: true,
                createdByNIK: true,
                items: true,
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
            // ── PDF snapshot (non-fatal) — captures COMPLETED state
            // Photos will be archived to Drive when the PJUM is finally approved by BnM.
            try {
                await generateAndSaveReportSnapshot({
                    reportNumber,
                    checkpoint: "COMPLETED",
                });
            } catch (snapshotError) {
                logger.warn(
                    { operation: "approveFinal.snapshot", reportNumber },
                    `Gagal membuat snapshot PDF COMPLETED: ${getErrorDetail(snapshotError)}`,
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
