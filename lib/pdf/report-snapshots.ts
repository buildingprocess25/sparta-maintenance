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
    "completedPdfPath"
> = {
    PENDING_ESTIMATION: "completedPdfPath",
    ESTIMATION_APPROVED: "completedPdfPath",
    APPROVED_BMC: "completedPdfPath",
    COMPLETED: "completedPdfPath",
};

export async function generateAndSaveReportSnapshot(params: {
    reportNumber: string;
    checkpoint: ReportPdfCheckpoint;
    updateFinalDriveUrl?: boolean;
}) {
    if (params.checkpoint !== "COMPLETED") {
        throw new Error(
            `Snapshot PDF hanya didukung untuk status COMPLETED (got: ${params.checkpoint})`,
        );
    }
    const built = await buildReportPdfBuffer(params.reportNumber);

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
        data: {
            [fieldName]: driveUrl,
            ...(params.updateFinalDriveUrl
                ? { reportFinalDriveUrl: driveUrl }
                : {}),
        },
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
