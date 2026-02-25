"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { generateReportNumber } from "@/lib/report-helpers";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import type { Prisma } from "@prisma/client";
import {
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import type { DraftData } from "./types";
import { draftDataSchema, deleteDraftSchema } from "./types";

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

export async function getDraft() {
    const user = await requireRole("BMS");

    const draft = await prisma.report.findFirst({
        where: {
            createdByNIK: user.NIK,
            status: "DRAFT",
        },
        include: {
            store: {
                select: {
                    code: true,
                    name: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return draft;
}

export async function saveDraft(data: DraftData) {
    const parsed = draftDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data draft tidak valid",
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

        if (existingDraft) {
            const updatedReport = await prisma.report.update({
                where: { reportNumber: existingDraft.reportNumber },
                data: {
                    storeCode: data.storeCode || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            return { reportId: updatedReport.reportNumber };
        } else {
            const store = data.storeCode
                ? await prisma.store.findUnique({
                      where: { code: data.storeCode },
                      select: { code: true },
                  })
                : null;
            const reportNumber = await generateReportNumber(store?.code);

            const newReport = await prisma.report.create({
                data: {
                    reportNumber,
                    storeCode: data.storeCode || null,
                    storeName: data.storeName || "",
                    branchName: data.branchName || "",
                    totalEstimation: data.totalEstimation || 0,
                    status: "DRAFT",
                    createdByNIK: user.NIK,
                    items: itemsJson,
                    estimations: estimationsJson,
                },
            });

            return { reportId: newReport.reportNumber };
        }
    } catch (error) {
        logger.error({ operation: "saveDraft" }, "Failed to save draft", error);
        return {
            error: "Gagal menyimpan draft",
            detail: getErrorDetail(error),
        };
    }
}

export async function deleteDraft(reportNumber: string) {
    const parsed = deleteDraftSchema.safeParse({ reportNumber });
    if (!parsed.success) {
        return {
            error: "Report number tidak valid",
            detail: parsed.error.message,
        };
    }

    try {
        await requireRole("BMS");

        const headersList = await headers();
        await validateCSRF(headersList);

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: { createdByNIK: true, status: true, items: true },
        });

        if (!report) {
            return { error: "Draft tidak ditemukan" };
        }

        if (report.status !== "DRAFT") {
            return { error: "Hanya draft yang bisa dihapus" };
        }

        await requireOwnership(report.createdByNIK);

        if (report.items && Array.isArray(report.items)) {
            const items = report.items as unknown as ReportItemJson[];
            const storagePaths: string[] = [];

            for (const item of items) {
                if (item.photoUrl && item.photoUrl.includes("supabase.co")) {
                    try {
                        const urlObj = new URL(item.photoUrl);
                        const pathAfterBucket =
                            urlObj.pathname.split("/reports/")[1];
                        if (pathAfterBucket) {
                            storagePaths.push(
                                decodeURIComponent(pathAfterBucket),
                            );
                        }
                    } catch {
                        // Skip URL yang tidak valid
                    }
                }
            }

            if (storagePaths.length > 0) {
                const { getSupabaseClient } = await import("@/lib/supabase");

                const { error: storageError } = await getSupabaseClient()
                    .storage.from("reports")
                    .remove(storagePaths);

                if (storageError) {
                    logger.error(
                        { operation: "deleteDraft", reportNumber },
                        "Failed to delete photos from storage",
                        storageError,
                    );
                }
            }
        }

        await prisma.report.delete({
            where: { reportNumber },
        });
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "deleteDraft", reportNumber },
            "Failed to delete draft",
            error,
        );
        return {
            error: "Gagal menghapus draft",
            detail: getErrorDetail(error),
        };
    }
}
