"server-only";

import prisma from "@/lib/prisma";
import { parseStartWorkPhotoUrls } from "@/lib/report-start-work-revision";
import { ReportStatus } from "@prisma/client";
import type {
    MaterialEstimationJson,
    MaterialStoreJson,
    ReportItemJson,
} from "@/types/report";

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
            totalEstimation: true,
            startSelfieUrl: true,
            startReceiptUrls: true,
            startMaterialStores: true,
            completionNotes: true,
            completionAdditionalPhotos: true,
            completionAdditionalNote: true,
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
        totalEstimation: Number(report.totalEstimation),
        items: report.items as unknown as ReportItemJson[],
        estimations: report.estimations as unknown as MaterialEstimationJson[],
        startSelfieUrls: parseStartWorkPhotoUrls(report.startSelfieUrl),
        startReceiptUrls: parseStartWorkPhotoUrls(report.startReceiptUrls),
        startMaterialStores:
            report.startMaterialStores as unknown as MaterialStoreJson[],
        completionAdditionalPhotos: parseStartWorkPhotoUrls(
            report.completionAdditionalPhotos,
        ),
    };
}

export type ReportForCompletion = Awaited<
    ReturnType<typeof getReportForCompletion>
>;
