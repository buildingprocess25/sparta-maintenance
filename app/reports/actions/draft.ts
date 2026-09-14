"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import {
    requireRole,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DraftData } from "./types";
import { deleteDraftSchema, draftAutosaveDataSchema } from "./types";
import { buildItemsJson, buildEstimationsJson } from "./report-json-helpers";
import { ensureDriveDraftReport } from "./ensure-drive-draft";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import type { SerializedDraft } from "../(bms)/create/components/types";
import { getChecklistItemMeta } from "@/lib/checklist-data";

export async function getDraft(): Promise<SerializedDraft | null> {
    const user = await requireRole("BMS");

    const draft = await prisma.report.findFirst({
        where: {
            createdByNIK: user.NIK,
            status: "DRAFT",
        },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            totalEstimation: true,
            items: true,
            estimations: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
    });

    return draft ? serializeDraft(draft) : null;
}

export async function getDraftByReportNumber(
    reportNumber: string,
): Promise<SerializedDraft | null> {
    const user = await requireRole("BMS");

    const draft = await prisma.report.findFirst({
        where: {
            reportNumber,
            createdByNIK: user.NIK,
            status: "DRAFT",
        },
        select: {
            reportNumber: true,
            storeCode: true,
            storeName: true,
            branchName: true,
            totalEstimation: true,
            items: true,
            estimations: true,
            updatedAt: true,
        },
    });

    return draft ? serializeDraft(draft) : null;
}

export async function saveServerDraft(data: DraftData) {
    const parsed = draftAutosaveDataSchema.safeParse(data);
    if (!parsed.success) {
        return {
            error: "Data draft tidak valid",
            detail: "Draft belum bisa disimpan ke server.",
        };
    }

    try {
        const user = await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        let draftReportNumber = parsed.data.draftReportNumber;
        if (!draftReportNumber) {
            if (!parsed.data.storeCode) {
                return { error: "Pilih toko sebelum menyimpan draft" };
            }
            const reserved = await ensureDriveDraftReport(parsed.data.storeCode);
            if ("error" in reserved) return reserved;
            draftReportNumber = reserved.reportNumber;
        }

        const itemsJson = buildItemsJson(parsed.data);
        const estimationsJson = buildEstimationsJson(parsed.data);

        const updated = await prisma.report.updateMany({
            where: {
                reportNumber: draftReportNumber,
                createdByNIK: user.NIK,
                status: "DRAFT",
            },
            data: {
                storeCode: parsed.data.storeCode || null,
                storeName: parsed.data.storeName || "",
                branchName: parsed.data.branchName || user.branchNames[0] || "",
                totalEstimation: parsed.data.totalEstimation || 0,
                items: itemsJson,
                estimations: estimationsJson,
            },
        });

        if (updated.count !== 1) {
            return { error: "Draft laporan tidak ditemukan" };
        }

        revalidatePath("/reports");
        return {
            success: true as const,
            reportNumber: draftReportNumber,
            savedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error(
            { operation: "saveServerDraft" },
            "Failed to autosave BMS server draft",
            error,
        );
        return {
            error: "Gagal menyimpan draft ke server",
            detail: getErrorDetail(error),
        };
    }
}

export async function discardLocalDraftFiles(fileKeys: string[]) {
    try {
        await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
            return { success: true };
        }

        if (!process.env.UPLOADTHING_TOKEN) {
            return { success: true };
        }

        const { UTApi } = await import("uploadthing/server");
        const utapi = new UTApi();
        await utapi.deleteFiles(fileKeys);

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "discardLocalDraftFiles" },
            "Failed to discard local draft files",
            error,
        );
        return {
            error: "Gagal menghapus file draft di server",
            detail: getErrorDetail(error),
        };
    }
}

type DraftRecord = {
    reportNumber: string;
    storeCode: string | null;
    storeName: string;
    branchName: string;
    totalEstimation: unknown;
    items: unknown;
    estimations: unknown;
    updatedAt: Date;
};

function serializeDraft(draft: DraftRecord): SerializedDraft {
    const items = (draft.items ?? []) as ReportItemJson[];
    const estimations = (draft.estimations ?? []) as MaterialEstimationJson[];

    return {
        reportNumber: draft.reportNumber,
        storeName: draft.storeName,
        storeCode: draft.storeCode || "",
        branchName: draft.branchName,
        totalEstimation: Number(draft.totalEstimation),
        updatedAt: draft.updatedAt.toISOString(),
        items: items.map((item) => {
            const meta = getChecklistItemMeta(item.itemId);

            return {
                itemId: item.itemId,
                itemName: item.itemName || meta?.itemName || item.itemId,
                categoryName: item.categoryName || meta?.categoryName || "-",
                condition: item.condition,
                preventiveCondition: item.preventiveCondition,
                handler: item.handler,
                photoUrl: item.photoUrl ?? item.images?.[0] ?? null,
                photoKey: item.photoKey ?? null,
                images: item.images ?? [],
                notes: item.notes ?? null,
                ahoTicketNumber: item.ahoTicketNumber ?? null,
            };
        }),
        estimations: estimations.map((est) => ({
            itemId: est.itemId,
            materialName: est.materialName,
            quantity: est.quantity,
            unit: est.unit,
            price: est.price,
            totalPrice: est.totalPrice,
        })),
    };
}

export async function discardDriveDraftReport(reportNumber: string) {
    try {
        const user = await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        const parsed = deleteDraftSchema.safeParse({ reportNumber });
        if (!parsed.success) {
            return { error: "Nomor draft tidak valid" };
        }

        await prisma.report.deleteMany({
            where: {
                reportNumber: parsed.data.reportNumber,
                createdByNIK: user.NIK,
                status: "DRAFT",
            },
        });

        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "discardDriveDraftReport" },
            "Failed to discard reserved Drive draft report",
            error,
        );
        return {
            error: "Gagal menghapus draft laporan",
            detail: getErrorDetail(error),
        };
    }
}
