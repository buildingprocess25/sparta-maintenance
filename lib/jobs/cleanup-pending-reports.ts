import "server-only";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_PENDING_EXPIRY_DAYS = 14;
const UT_DELETE_BATCH_SIZE = 100;

export type CleanupPendingReportsResult = {
    cutoffDate: string;
    reportsFound: number;
    reportsDeleted: number;
    photosDeleted: number;
    failedReports: string[];
};

function getPendingExpiryDays(): number {
    const raw = process.env.CLEANUP_PENDING_EXPIRY_DAYS;
    if (!raw) return DEFAULT_PENDING_EXPIRY_DAYS;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
        logger.warn(
            {
                operation: "cleanupPendingReports",
                cleanupPendingExpiryDays: raw,
            },
            "Invalid CLEANUP_PENDING_EXPIRY_DAYS, falling back to default",
        );
        return DEFAULT_PENDING_EXPIRY_DAYS;
    }

    return parsed;
}

type PhotoDeleteResult = {
    deletedCount: number;
    errorCount: number;
};

/**
 * Deletes all UploadThing files associated with a report.
 * File keys are stored in `uploadthingFileKeys` JSON column.
 */
async function deletePhotosFromUploadThing(
    fileKeys: string[],
): Promise<PhotoDeleteResult> {
    if (fileKeys.length === 0) return { deletedCount: 0, errorCount: 0 };

    let deletedCount = 0;
    let errorCount = 0;

    try {
        const { UTApi } = await import("uploadthing/server");
        const utapi = new UTApi();

        // Process in batches to avoid hitting API limits
        for (let i = 0; i < fileKeys.length; i += UT_DELETE_BATCH_SIZE) {
            const batch = fileKeys.slice(i, i + UT_DELETE_BATCH_SIZE);
            try {
                await utapi.deleteFiles(batch);
                deletedCount += batch.length;
            } catch (batchErr) {
                errorCount += batch.length;
                logger.warn(
                    {
                        operation: "cleanupPendingReports.deletePhotos",
                        batchSize: batch.length,
                        batchStart: i,
                    },
                    `Failed deleting UploadThing files batch: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`,
                );
            }
        }
    } catch (err) {
        errorCount = fileKeys.length;
        logger.error(
            { operation: "cleanupPendingReports.deletePhotos" },
            "Failed to initialize UTApi for cleanup",
            err,
        );
    }

    return { deletedCount, errorCount };
}

export async function cleanupPendingReports(): Promise<CleanupPendingReportsResult> {
    const pendingExpiryDays = getPendingExpiryDays();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - pendingExpiryDays);

    const reportsToDelete = await prisma.report.findMany({
        where: {
            status: "PENDING_ESTIMATION",
            createdAt: { lt: cutoffDate },
        },
        select: {
            reportNumber: true,
            uploadthingFileKeys: true,
        },
    });

    const result: CleanupPendingReportsResult = {
        cutoffDate: cutoffDate.toISOString(),
        reportsFound: reportsToDelete.length,
        reportsDeleted: 0,
        photosDeleted: 0,
        failedReports: [],
    };

    logger.info(
        {
            operation: "cleanupPendingReports",
            cutoffDate: result.cutoffDate,
            reportsFound: result.reportsFound,
        },
        "Starting pending-report cleanup job",
    );

    for (const report of reportsToDelete) {
        try {
            const fileKeys = Array.isArray(report.uploadthingFileKeys)
                ? (report.uploadthingFileKeys as string[])
                : [];

            const { deletedCount, errorCount } =
                await deletePhotosFromUploadThing(fileKeys);

            result.photosDeleted += deletedCount;

            if (errorCount > 0) {
                result.failedReports.push(report.reportNumber);
                logger.error(
                    {
                        operation: "cleanupPendingReports",
                        reportNumber: report.reportNumber,
                        photoDeleteErrors: errorCount,
                    },
                    "Skipping report deletion because some photos failed to delete",
                );
                continue;
            }

            await prisma.$transaction([
                prisma.activityLog.deleteMany({
                    where: { reportNumber: report.reportNumber },
                }),
                prisma.approvalLog.deleteMany({
                    where: { reportNumber: report.reportNumber },
                }),
                prisma.report.delete({
                    where: { reportNumber: report.reportNumber },
                }),
            ]);

            result.reportsDeleted += 1;
        } catch (error) {
            result.failedReports.push(report.reportNumber);
            logger.error(
                {
                    operation: "cleanupPendingReports",
                    reportNumber: report.reportNumber,
                },
                "Failed to cleanup pending report",
                error,
            );
        }
    }

    logger.info(
        {
            operation: "cleanupPendingReports",
            ...result,
        },
        "Pending-report cleanup job completed",
    );

    return result;
}
