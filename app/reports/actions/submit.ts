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

/**
 * Moves every photo that was uploaded to the DRAFT folder in Supabase Storage
 * to the real report number folder.
 *
 * Upload path at capture time: `{branch}/{storeCode}/DRAFT-{NIK}/{itemId}_{name}.ext`
 * Correct path after submit:   `{branch}/{storeCode}/{reportNumber}/{itemId}_{name}.ext`
 *
 * Returns the updated checklistItems array with corrected photoUrl values.
 */
async function migrateReportPhotos(
    items: DraftData["checklistItems"],
    draftId: string,
    reportId: string,
): Promise<DraftData["checklistItems"]> {
    const { getSupabaseClient } = await import("@/lib/supabase");
    const storage = getSupabaseClient().storage.from("reports");

    const results = await Promise.allSettled(
        items.map(async (item) => {
            if (!item.photoUrl || !item.photoUrl.includes(`/${draftId}/`)) {
                return item;
            }
            try {
                const urlObj = new URL(item.photoUrl);
                // pathname: /storage/v1/object/public/reports/{path}
                const oldPath = decodeURIComponent(
                    urlObj.pathname.split("/reports/")[1] ?? "",
                );
                if (!oldPath) return item;

                const newPath = oldPath.replace(
                    `/${draftId}/`,
                    `/${reportId}/`,
                );

                const { error } = await storage.move(oldPath, newPath);
                if (error) {
                    logger.error(
                        { operation: "migrateReportPhotos", draftId, reportId },
                        "Failed to move photo in storage",
                        error,
                    );
                    // Non-fatal: keep the old URL — file is still accessible
                    return item;
                }

                const {
                    data: { publicUrl },
                } = storage.getPublicUrl(newPath);
                return {
                    ...item,
                    photoUrl: `${publicUrl}?t=${Date.now()}`,
                };
            } catch {
                return item;
            }
        }),
    );

    return results.map((r, i) =>
        r.status === "fulfilled" ? r.value : items[i],
    );
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
                // Draft key is DRAFT-{NIK}; replace with real sequential number on submit.
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
                        status: "PENDING_ESTIMATION",
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
                        status: "PENDING_ESTIMATION",
                        createdByNIK: user.NIK,
                        items: itemsJson,
                        estimations: estimationsJson,
                    },
                });

                finalReportId = newReport.reportNumber;
            }

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

        // ── Photo migration ────────────────────────────────────────────────
        // Photos were uploaded to DRAFT-{NIK}/ during drafting.
        // Now that we have a real report number, move them to the correct
        // folder ({branch}/{storeCode}/{reportNumber}/) and patch the DB row.
        if (existingDraft?.reportNumber.startsWith("DRAFT-")) {
            try {
                const migratedItems = await migrateReportPhotos(
                    data.checklistItems,
                    existingDraft.reportNumber,
                    reportId,
                );

                const anyMoved = migratedItems.some(
                    (item, i) =>
                        item.photoUrl !== data.checklistItems[i]?.photoUrl,
                );

                if (anyMoved) {
                    await prisma.report.update({
                        where: { reportNumber: reportId },
                        data: {
                            items: buildItemsJson({
                                ...data,
                                checklistItems: migratedItems,
                            }),
                        },
                    });
                }
            } catch (err) {
                // Non-fatal: report is submitted, photos are still accessible
                // at the old DRAFT path. Log and continue.
                logger.error(
                    { operation: "submitReport", reportId },
                    "Photo migration failed (non-fatal, photos remain at draft path)",
                    err,
                );
            }
        }
        // ──────────────────────────────────────────────────────────────────

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
