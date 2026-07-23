import "server-only";

import prisma from "@/lib/prisma";
import { ARCHIVED_PREVENTIVE_STATUS } from "@/lib/report-status";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import type { SearchedReport } from "./revisi-laporan-client";

export async function getRevisionReport(
    reportNumber: string,
): Promise<SearchedReport | null> {
    const normalizedReportNumber = reportNumber.trim();
    if (!normalizedReportNumber) return null;

    const found = await prisma.report.findFirst({
        where: {
            reportNumber: normalizedReportNumber,
            status: { not: ARCHIVED_PREVENTIVE_STATUS },
        },
        include: {
            createdBy: { select: { name: true, NIK: true } },
            store: { select: { name: true, code: true } },
        },
    });

    if (!found) return null;

    return {
        reportNumber: found.reportNumber,
        storeName: found.store?.name ?? found.storeName,
        storeCode: found.store?.code ?? found.storeCode,
        branchName: found.branchName,
        status: found.status,
        totalReal: Number(found.totalReal ?? 0),
        createdAt: found.createdAt.toISOString(),
        updatedAt: found.updatedAt.toISOString(),
        bmsName: found.createdBy.name,
        bmsNIK: found.createdByNIK,
        completedPdfPath: found.completedPdfPath,
        reportFinalDriveUrl: found.reportFinalDriveUrl,
        revisedPdfDriveUrl: found.revisedPdfDriveUrl,
        revisedPdfFolderUrl: found.revisedPdfFolderUrl,
        items: (found.items ?? []) as unknown as ReportItemJson[],
        estimations: (found.estimations ??
            []) as unknown as MaterialEstimationJson[],
    };
}
