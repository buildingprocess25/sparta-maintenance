"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { generateReportNumber } from "@/lib/report-helpers";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { draftDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";
import { checklistCategories } from "@/lib/checklist-data";
import { getLastCategoryIDate } from "./queries";

/** Kuartal: 0=Q1, 1=Q2, 2=Q3, 3=Q4 */
function getQuarter(d: Date): number {
    return Math.floor(d.getMonth() / 3);
}

function isSameQuarterDate(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        getQuarter(d1) === getQuarter(d2)
    );
}

export async function submitReport(data: DraftData) {
    const parsed = draftDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data laporan tidak valid",
            detail: "Periksa kembali data laporan yang diisi.",
        };
    }

    try {
        const user = await requireRole("BMS");

        const headersList = await headers();
        await validateCSRF(headersList);

        // ── Server-side cooldown validation (defense-in-depth) ────────────────
        // Determine if Category I is currently in cooldown for this store.
        let isCoolingDown = false;
        if (data.storeCode) {
            const lastDateStr = await getLastCategoryIDate(data.storeCode);
            if (lastDateStr) {
                isCoolingDown = isSameQuarterDate(
                    new Date(lastDateStr),
                    new Date(),
                );
            }
        }

        // All Category I item IDs (preventive)
        const preventiveItemIds = new Set(
            checklistCategories
                .filter((cat) => cat.isPreventive)
                .flatMap((cat) => cat.items.map((i) => i.id)),
        );

        // Strip Category I items from payload if cooldown is active.
        // This prevents a client from bypassing the UI restriction.
        let checklistItems = data.checklistItems;
        if (isCoolingDown) {
            checklistItems = checklistItems.filter(
                (item) => !preventiveItemIds.has(item.itemId),
            );
        } else {
            // Quarterly visit: verify all non-preventive items are present.
            const submittedIds = new Set(
                checklistItems
                    .filter((item) => !preventiveItemIds.has(item.itemId))
                    .map((item) => item.itemId),
            );
            const requiredNonPreventiveIds = checklistCategories
                .filter((cat) => !cat.isPreventive)
                .flatMap((cat) => cat.items.map((i) => i.id));

            const missingItem = requiredNonPreventiveIds.find(
                (id) => !submittedIds.has(id),
            );
            if (missingItem) {
                return {
                    error: "Data laporan tidak lengkap",
                    detail: `Item checklist ${missingItem} tidak ditemukan dalam laporan`,
                };
            }
        }

        if (checklistItems.length === 0) {
            return {
                error: "Laporan tidak valid",
                detail: "Minimal satu item checklist harus diisi sebelum laporan dapat dikirim",
            };
        }

        const itemsJson = buildItemsJson({ ...data, checklistItems });
        const estimationsJson = buildEstimationsJson(data);

        // Always get the store to generate the correct sequence prefix
        const store = data.storeCode
            ? await prisma.store.findUnique({
                  where: { code: data.storeCode },
                  select: { code: true },
              })
            : null;

        // Extract file keys and IDs from checklist items
        const uploadthingFileKeys = checklistItems
            .map((item) => item.photoKey)
            .filter(Boolean) as string[];

        // Extract Google Drive CDN file IDs from checklist items
        const drivePhotoFileIds = checklistItems
            .map((item) => item.photoKey) // photoKey now contains Drive file ID
            .filter(Boolean) as string[];

        const reportId = await prisma.$transaction(async (tx) => {
            const reportNumber = await generateReportNumber(store?.code, tx);

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
                    uploadthingFileKeys: [] as unknown as Prisma.InputJsonValue, // No longer using UploadThing
                    drivePhotoFileIds:
                        drivePhotoFileIds as unknown as Prisma.InputJsonValue,
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
