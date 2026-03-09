"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import type { Prisma } from "@prisma/client";
import {
    requireRole,
    requireOwnership,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import type { DraftData } from "./types";
import { deleteDraftSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";

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
            // Draft key is stable per user: DRAFT-{NIK}.
            // The real sequential number (e.g. ALF1-YYMM-001) is
            // only generated when SUBMITTING the report.
            // This prevents sequence starvation from abandoned drafts.
            const reportNumber = `DRAFT-${user.NIK}`;

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
