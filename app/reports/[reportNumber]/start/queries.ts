"server-only";

import prisma from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

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
    if (report.status !== ReportStatus.ESTIMATION_APPROVED) return null;

    return {
        ...report,
        items: report.items as unknown as ReportItemJson[],
        estimations: report.estimations as unknown as MaterialEstimationJson[],
    };
}

export type ReportForStartWork = Awaited<
    ReturnType<typeof getReportForStartWork>
>;
