"server-only";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

/**
 * Get reports that BMS can start work on (ESTIMATION_APPROVED only).
 */
export async function getStartableReports(userNIK: string, search?: string) {
    const where: Record<string, unknown> = {
        createdByNIK: userNIK,
        status: ReportStatus.ESTIMATION_APPROVED,
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

export type StartableReport = Awaited<
    ReturnType<typeof getStartableReports>
>[number];

/**
 * Get a single report for the start-work form.
 * Only accessible by the report creator.
 */
export async function getReportForStartWork(
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
            createdByNIK: true,
        },
    });

    if (!report || report.createdByNIK !== userNIK) return null;

    if (report.status !== ReportStatus.ESTIMATION_APPROVED) {
        return null;
    }

    return {
        ...report,
        items: report.items as unknown as ReportItemJson[],
        estimations: report.estimations as unknown as MaterialEstimationJson[],
    };
}

export type ReportForStartWork = Awaited<
    ReturnType<typeof getReportForStartWork>
>;
