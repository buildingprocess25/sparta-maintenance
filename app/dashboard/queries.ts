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

/**
 * Fetch report statistics for a BMC user, scoped to their branches.
 */
export async function getBMCStats(branchNames: string[]) {
    try {
        const branchFilter = { branchName: { in: branchNames }, status: { not: "DRAFT" as const } };

        const [totalReports, needsAction, completed, rejected] =
            await Promise.all([
                prisma.report.count({ where: branchFilter }),
                prisma.report.count({
                    where: {
                        ...branchFilter,
                        status: { in: ["PENDING_ESTIMATION", "PENDING_REVIEW"] },
                    },
                }),
                prisma.report.count({
                    where: { ...branchFilter, status: "COMPLETED" },
                }),
                prisma.report.count({
                    where: {
                        ...branchFilter,
                        status: { in: ["ESTIMATION_REJECTED", "ESTIMATION_REJECTED_REVISION"] },
                    },
                }),
            ]);

        return { totalReports, needsAction, completed, rejected };
    } catch (error) {
        logger.error(
            { operation: "getBMCStats", branchNames },
            "Failed to fetch BMC stats",
            error,
        );
        throw error;
    }
}
