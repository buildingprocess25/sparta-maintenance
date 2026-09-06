import "server-only";

import prisma from "@/lib/prisma";
import { buildReportPdfBuffer } from "@/lib/pdf/report-pdf-builder";
import { buildReportPdfFullBuffer } from "@/lib/pdf/report-pdf-full-builder";
import { uploadCompletedReportToDrive } from "@/lib/google-drive/archive";
import { type ReportPdfCheckpoint } from "@/lib/pdf/snapshot-storage";

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

    const uploaded = await uploadCompletedReportToDrive({
        branchName: built.report.branchName,
        bmsNIK: built.report.createdByNIK,
        bmsName: built.report.createdByName,
        storeCode: built.report.storeCode,
        storeName: built.report.storeName,
        reportNumber: built.report.reportNumber,
        pdfBuffer: built.buffer,
    });
    const driveUrl =
        uploaded.webViewLink ??
        `https://drive.google.com/file/d/${uploaded.fileId}/view`;

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

// ─── Laporan Lengkap PDF snapshot ────────────────────────────────────────────

/**
 * Generates the full report PDF (with checklist photo documentation),
 * uploads it to Google Drive under the same folder as the standard PDF
 * (filename: `{reportNumber}_full.pdf`), saves the Drive URL to the
 * `fullPdfDriveUrl` field in the Report record, and returns the URL + buffer.
 */
export async function generateAndSaveFullReportSnapshot(
    reportNumber: string,
): Promise<{ driveUrl: string; buffer: Buffer }> {
    const built = await buildReportPdfFullBuffer(reportNumber);

    const uploaded = await uploadCompletedReportToDrive({
        branchName: built.report.branchName,
        bmsNIK: built.report.createdByNIK,
        bmsName: built.report.createdByName,
        storeCode: built.report.storeCode,
        storeName: built.report.storeName,
        // Suffix _full so it doesn't overwrite the standard PDF file
        reportNumber: `${built.report.reportNumber}_full`,
        pdfBuffer: built.buffer,
    });

    const driveUrl =
        uploaded.webViewLink ??
        `https://drive.google.com/file/d/${uploaded.fileId}/view`;

    await prisma.report.update({
        where: { reportNumber },
        data: { fullPdfDriveUrl: driveUrl },
    });

    return { driveUrl, buffer: built.buffer };
}

/**
 * Returns the stored Drive URL for the full PDF if it exists, otherwise null.
 */
export function resolveFullReportSnapshotUrl(report: {
    fullPdfDriveUrl: string | null;
}): string | null {
    return report.fullPdfDriveUrl?.trim() || null;
}
