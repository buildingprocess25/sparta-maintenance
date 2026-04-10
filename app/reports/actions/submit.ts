"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { generateReportNumber } from "@/lib/report-helpers";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";
import { generateAndSaveReportSnapshot } from "@/lib/pdf/report-snapshots";


export async function submitReport(data: DraftData) {
    const parsed = draftDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data laporan tidak valid",
            detail: parsed.error.message,
        };
    }

    try {
        const user = await requireRole("BMS");

        const headersList = await headers();
        await validateCSRF(headersList);

        const itemsJson = buildItemsJson(data);
        const estimationsJson = buildEstimationsJson(data);

        // Always get the store to generate the correct sequence prefix
        const store = data.storeCode
            ? await prisma.store.findUnique({
                  where: { code: data.storeCode },
                  select: { code: true },
              })
            : null;

        // Extract uploadthing file keys from checklist items
        const uploadthingFileKeys = data.checklistItems
            .map((item) => item.photoKey)
            .filter(Boolean) as string[];

        const reportId = await prisma.$transaction(async (tx) => {
            const reportNumber = await generateReportNumber(
                store?.code,
                tx,
            );

            const newReport = await tx.report.create({
                data: {
                    reportNumber,
                    storeCode: data.storeCode || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "PENDING_ESTIMATION",
                    createdByNIK: user.NIK,
                    items: itemsJson,
                    estimations: estimationsJson,
                    uploadthingFileKeys, // Save the mapped file keys
                },
            });

            const finalReportId = newReport.reportNumber;

            // Record submission in ActivityLog
            await tx.activityLog.create({
                data: {
                    reportNumber: finalReportId,
                    actorNIK: user.NIK,
                    action: "SUBMITTED",
                    notes: null,
                },
            });

            return finalReportId;
        });

        try {
            await generateAndSaveReportSnapshot({
                reportNumber: reportId,
                checkpoint: "PENDING_ESTIMATION",
            });
        } catch (snapshotError) {
            logger.warn(
                { operation: "submitReport.snapshot", reportId },
                `Gagal membuat snapshot PDF PENDING_ESTIMATION: ${getErrorDetail(snapshotError)}`,
            );
        }

        revalidatePath("/reports");

        return { success: true, reportId };
    } catch (error) {
        logger.error(
            { operation: "submitReport" },
            "Failed to submit report",
            error,
        );
        return {
            error: "Gagal mengirim laporan",
            detail: getErrorDetail(error),
        };
    }
}
