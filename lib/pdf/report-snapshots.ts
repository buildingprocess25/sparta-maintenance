import "server-only";

import prisma from "@/lib/prisma";
import { buildReportPdfBuffer } from "@/lib/pdf/report-pdf-builder";
import {
    buildFinalReportDrivePath,
    type ReportPdfCheckpoint,
    uploadPdfSnapshot,
} from "@/lib/pdf/snapshot-storage";

const checkpointFieldMap: Record<
    ReportPdfCheckpoint,
    | "pendingEstimationPdfPath"
    | "estimationApprovedPdfPath"
    | "approvedBmcPdfPath"
    | "completedPdfPath"
> = {
    PENDING_ESTIMATION: "pendingEstimationPdfPath",
    ESTIMATION_APPROVED: "estimationApprovedPdfPath",
    APPROVED_BMC: "approvedBmcPdfPath",
    COMPLETED: "completedPdfPath",
};

export async function generateAndSaveReportSnapshot(params: {
    reportNumber: string;
    checkpoint: ReportPdfCheckpoint;
}) {
    if (params.checkpoint !== "COMPLETED") {
        throw new Error(
            `Snapshot PDF hanya didukung untuk status COMPLETED (got: ${params.checkpoint})`,
        );
    }
    const built = await buildReportPdfBuffer(params.reportNumber);
    const version = String(built.report.updatedAt.getTime());

    const path = buildFinalReportDrivePath({
        branchName: built.report.branchName,
        bmsNIK: built.report.createdByNIK,
        bmsName: built.report.createdByName,
        storeCode: built.report.storeCode,
        storeName: built.report.storeName,
        reportNumber: built.report.reportNumber,
    });

    // uploadPdfSnapshot now returns the Drive webViewLink URL so we can
    // link directly to Drive without proxying through the server.
    const driveUrl = await uploadPdfSnapshot(path, built.buffer);

    const fieldName = checkpointFieldMap[params.checkpoint];
    await prisma.report.update({
        where: { reportNumber: params.reportNumber },
        data: { [fieldName]: driveUrl },
    });

    return {
        driveUrl,
        buffer: built.buffer,
    };
}

export function resolveReportSnapshotPath(report: {
    status: string;
    completedPdfPath: string | null;
}) {
    if (report.status === "COMPLETED" && report.completedPdfPath) {
        return report.completedPdfPath;
    }
    return null;
}
