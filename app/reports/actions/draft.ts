"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
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

export async function discardLocalDraftFiles(fileKeys: string[]) {
    try {
        await requireRole("BMS");
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
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
