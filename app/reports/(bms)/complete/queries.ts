"server-only";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

/**
 * Get reports that BMS can submit completion for.
 * Includes IN_PROGRESS and REVIEW_REJECTED_REVISION.
 */
export async function getWorkableReports(userNIK: string, search?: string) {
    const where: Record<string, unknown> = {
        createdByNIK: userNIK,
        status: {
            in: [
                ReportStatus.IN_PROGRESS,
                ReportStatus.REVIEW_REJECTED_REVISION,
            ],
        },
    };

    if (search) {
        where.OR = [
            { reportNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
        ];
    }

    const reports = await prisma.report.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        select: {
            reportNumber: true,
            storeName: true,
            branchName: true,
            storeCode: true,
            status: true,
            updatedAt: true,
        },
    });

    return reports;
}

export type WorkableReport = Awaited<
    ReturnType<typeof getWorkableReports>
>[number];

/**
 * Get a single report for the completion form (with items and estimations).
 * Only accessible by the report creator.
 */
export async function getReportForCompletion(
    reportNumber: string,
    userNIK: string,
) {
    const report = await prisma.report.findUnique({
        where: { reportNumber },
        select: {
            reportNumber: true,
            storeName: true,
            branchName: true,
            storeCode: true,
            status: true,
            items: true,
            estimations: true,
            completionSelfieUrl: true,
            createdByNIK: true,
        },
    });

    if (!report || report.createdByNIK !== userNIK) return null;

    if (
        report.status !== ReportStatus.IN_PROGRESS &&
        report.status !== ReportStatus.REVIEW_REJECTED_REVISION
    ) {
        return null;
    }

    return {
        ...report,
        items: report.items as unknown as ReportItemJson[],
        estimations: report.estimations as unknown as MaterialEstimationJson[],
    };
}

export type ReportForCompletion = Awaited<
    ReturnType<typeof getReportForCompletion>
>;
