"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { generateReportNumber } from "@/lib/report-helpers";
import type { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendReportNotification } from "@/lib/email/send-report-notification";
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";

function buildItemsJson(data: DraftData): Prisma.InputJsonValue {
    return data.checklistItems
        .filter((item) => item.condition || item.preventiveCondition)
        .map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName,
            condition: item.condition || null,
            preventiveCondition: item.preventiveCondition || null,
            handler: item.handler || null,
            photoUrl: item.photoUrl || null,
            notes: item.notes || null,
        })) as unknown as Prisma.InputJsonValue;
}

function buildEstimationsJson(data: DraftData): Prisma.InputJsonValue {
    const estimations: MaterialEstimationJson[] = [];
    for (const [itemId, ests] of Object.entries(data.bmsEstimations)) {
        for (const est of ests) {
            estimations.push({
                itemId,
                materialName: est.itemName,
                quantity: est.quantity,
                unit: est.unit,
                price: est.price,
                totalPrice: est.totalPrice,
            });
        }
    }
    return estimations as unknown as Prisma.InputJsonValue;
}

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

        const existingDraft = await prisma.report.findFirst({
            where: {
                createdByNIK: user.NIK,
                status: "DRAFT",
            },
        });

        // Always get the store to generate the correct sequence prefix
        const store = data.storeCode
            ? await prisma.store.findUnique({
                  where: { code: data.storeCode },
                  select: { code: true },
              })
            : null;

        const reportId = await prisma.$transaction(async (tx) => {
            let finalReportId: string;

            if (existingDraft) {
                // Check if the draft has a temporary ID (DRAFT-cuid).
                // If yes, we must generate a real sequential report number for the final submission.
                let finalReportNumber = existingDraft.reportNumber;
                if (finalReportNumber.startsWith("DRAFT-")) {
                    finalReportNumber = await generateReportNumber(
                        store?.code,
                        tx,
                    );
                }

                // Using Prisma update with primary key change
                await tx.report.update({
                    where: { reportNumber: existingDraft.reportNumber },
                    data: {
                        reportNumber: finalReportNumber,
                        storeCode: data.storeCode || null,
                        storeName: data.storeName || "",
                        branchName: data.branchName || "",
                        totalEstimation: data.totalEstimation || 0,
                        status: "PENDING_APPROVAL",
                        items: itemsJson,
                        estimations: estimationsJson,
                    },
                });

                finalReportId = finalReportNumber;
            } else {
                // New report directly submitted without saving draft first
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
                        status: "PENDING_APPROVAL",
                        createdByNIK: user.NIK,
                        items: itemsJson,
                        estimations: estimationsJson,
                    },
                });

                finalReportId = newReport.reportNumber;
            }
            return finalReportId;
        });

        revalidatePath("/reports");

        sendReportNotification(reportId).catch((err) => {
            logger.error(
                { operation: "submitReport", reportId },
                "Failed to send notification email",
                err,
            );
        });

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
