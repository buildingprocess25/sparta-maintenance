"use server";

import prisma from "@/lib/prisma";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import {
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { createResubmitDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";
import {
    calculateBmsBalance,
    createNewBmsPeriod,
    getBmsActivePeriod,
    hasBmsRepairItems,
} from "@/lib/balance";
import { isChecklistOnlyReport } from "@/lib/report-utils";
import type { ReportItemJson } from "@/types/report";

/**
 * Resubmit a REJECTED report after revision.
 * Updates the report content and sets status back to PENDING_APPROVAL.
 */
export async function resubmitReport(reportNumber: string, data: DraftData) {
    try {
        const user = await requireRole("BMS");

        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: {
                createdByNIK: true,
                status: true,
                items: true,
                totalEstimation: true,
                balancePeriodId: true,
            },
        });

        if (!report) {
            return { error: "Laporan tidak ditemukan" };
        }

        const REVISION_STATUSES = [
            "ESTIMATION_REJECTED_REVISION",
            "REVIEW_REJECTED_REVISION",
        ] as const;
        type RevisionStatus = (typeof REVISION_STATUSES)[number];

        if (!(REVISION_STATUSES as readonly string[]).includes(report.status)) {
            return {
                error: "Hanya laporan dengan status revisi yang bisa diajukan ulang",
            };
        }

        const currentStatus = report.status as RevisionStatus;

        await requireOwnership(report.createdByNIK);

        const existingItemIds = new Set<string>();
        if (Array.isArray(report.items)) {
            for (const item of report.items) {
                const itemId = (item as { itemId?: unknown } | null)?.itemId;
                if (typeof itemId === "string") existingItemIds.add(itemId);
            }
        }

        const parsed = createResubmitDataSchema(existingItemIds).safeParse(data);
        if (!parsed.success) {
            return {
                error: "Data laporan tidak valid",
                detail: "Periksa kembali data laporan yang diisi.",
            };
        }
        data = parsed.data;

        const itemsJson = buildItemsJson(data);
        const estimationsJson = buildEstimationsJson(data);
        const hasBalanceImpact = hasBmsRepairItems(itemsJson);
        let activePeriodId = report.balancePeriodId;

        if (
            hasBalanceImpact &&
            currentStatus === "ESTIMATION_REJECTED_REVISION"
        ) {
            const balance = await calculateBmsBalance(user.NIK);
            if (balance.isLocked) {
                return {
                    error:
                        "Saldo operasional Anda sedang terkunci karena ada PJUM yang menunggu persetujuan BNM. Harap tunggu hingga PJUM diproses.",
                };
            }

            const previousEstimation = Number(report.totalEstimation ?? 0);
            const revisedEstimation = data.totalEstimation || 0;
            const availableForThisReport =
                balance.availableBalance + previousEstimation;

            if (revisedEstimation > availableForThisReport) {
                const formatter = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                });
                return {
                    error: `Estimasi biaya ${formatter.format(revisedEstimation)} melebihi sisa saldo operasional Anda sebesar ${formatter.format(availableForThisReport)}. Harap sesuaikan estimasi atau koordinasikan dengan BMC.`,
                };
            }

            if (!activePeriodId) {
                const period = await getBmsActivePeriod(user.NIK);
                if (!period) {
                    const newPeriod = await createNewBmsPeriod(user.NIK);
                    activePeriodId = newPeriod.id;
                } else {
                    activePeriodId = period.id;
                }
            }
        }

        const revisedItems = itemsJson as unknown as ReportItemJson[];
        const newStatus =
            currentStatus === "REVIEW_REJECTED_REVISION"
                ? "PENDING_REVIEW"
                : isChecklistOnlyReport(revisedItems)
                  ? "PENDING_CHECKLIST_REVIEW"
                  : "PENDING_ESTIMATION";

        await prisma.$transaction(async (tx) => {
            // Delete the rejection log entry before resubmitting
            await tx.approvalLog.deleteMany({
                where: { reportNumber, status: currentStatus },
            });

            await tx.report.update({
                where: { reportNumber, status: currentStatus },
                data: {
                    storeCode: data.storeCode || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: newStatus,
                    items: itemsJson,
                    estimations: estimationsJson,
                    balancePeriodId: activePeriodId,
                },
            });

            const activityAction =
                currentStatus === "REVIEW_REJECTED_REVISION"
                    ? "RESUBMITTED_WORK"
                    : "RESUBMITTED_ESTIMATION";

            await tx.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: activityAction,
                    notes: null,
                },
            });
        });

        revalidatePath("/reports");
        revalidatePath(`/reports/${reportNumber}`);

        dispatchNotificationEvent({
            type:
                newStatus === "PENDING_REVIEW"
                    ? "REPORT_COMPLETION_SUBMITTED"
                    : "REPORT_SUBMITTED",
            actorNIK: user.NIK,
            reportNumber,
        });

        return { success: true, reportId: reportNumber };
    } catch (error) {
        logger.error(
            { operation: "resubmitReport", reportNumber },
            "Failed to resubmit report",
            error,
        );
        return {
            error: "Gagal mengajukan ulang laporan",
            detail: getErrorDetail(error),
        };
    }
}
