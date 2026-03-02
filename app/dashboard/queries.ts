import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Fetch report statistics for the authenticated user (all time).
 * Used by the dashboard page to render summary cards.
 */
export async function getUserStats(userId: string) {
    try {
        const [totalReports, pendingReports, approvedReports, rejectedReports] =
            await Promise.all([
                prisma.report.count({
                    where: { createdByNIK: userId },
                }),
                prisma.report.count({
                    where: {
                        createdByNIK: userId,
                        status: { in: ["PENDING_ESTIMATION", "PENDING_REVIEW", "APPROVED_BMC"] },
                    },
                }),
                prisma.report.count({
                    where: {
                        createdByNIK: userId,
                        status: "COMPLETED",
                    },
                }),
                prisma.report.count({
                    where: {
                        createdByNIK: userId,
                        status: "ESTIMATION_REJECTED",
                    },
                }),
            ]);

        return {
            totalReports,
            pendingReports,
            approvedReports,
            rejectedReports,
        };
    } catch (error) {
        logger.error(
            { operation: "getUserStats", userId },
            "Failed to fetch user stats",
            error,
        );
        throw error;
    }
}
