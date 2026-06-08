import "server-only";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_PENDING_EXPIRY_DAYS = 14;

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
