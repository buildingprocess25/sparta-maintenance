import "server-only";

import prisma from "@/lib/prisma";
import { buildReportPdfBuffer } from "@/lib/pdf/report-pdf-builder";
import {
    buildReportSnapshotPath,
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
    const built = await buildReportPdfBuffer(params.reportNumber);
    const version = String(built.report.updatedAt.getTime());
    const path = buildReportSnapshotPath({
        branchName: built.report.branchName,
        storeCode: built.report.storeCode,
        reportNumber: built.report.reportNumber,
        checkpoint: params.checkpoint,
        version,
    });

    await uploadPdfSnapshot(path, built.buffer);

    const fieldName = checkpointFieldMap[params.checkpoint];
    await prisma.report.update({
        where: { reportNumber: params.reportNumber },
        data: {
            [fieldName]: path,
        },
    });

    return {
        path,
        buffer: built.buffer,
    };
}

export function resolveReportSnapshotPath(report: {
    status: string;
    pendingEstimationPdfPath: string | null;
    estimationApprovedPdfPath: string | null;
    approvedBmcPdfPath: string | null;
    completedPdfPath: string | null;
}) {
    if (report.status === "COMPLETED" && report.completedPdfPath) {
        return report.completedPdfPath;
    }

    if (report.status === "APPROVED_BMC" && report.approvedBmcPdfPath) {
        return report.approvedBmcPdfPath;
    }

    if (
        report.status === "ESTIMATION_APPROVED" &&
        report.estimationApprovedPdfPath
    ) {
        return report.estimationApprovedPdfPath;
    }

    if (
        report.status === "PENDING_ESTIMATION" &&
        report.pendingEstimationPdfPath
    ) {
        return report.pendingEstimationPdfPath;
    }

    return null;
}
