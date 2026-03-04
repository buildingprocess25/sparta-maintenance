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
                        status: {
                            in: [
                                "PENDING_ESTIMATION",
                                "PENDING_REVIEW",
                                "APPROVED_BMC",
                            ],
                        },
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
        const branchFilter = {
            branchName: { in: branchNames },
            status: { not: "DRAFT" as const },
        };

        const [totalReports, needsAction, completed, rejected] =
            await Promise.all([
                prisma.report.count({ where: branchFilter }),
                prisma.report.count({
                    where: {
                        ...branchFilter,
                        status: {
                            in: ["PENDING_ESTIMATION", "PENDING_REVIEW"],
                        },
                    },
                }),
                prisma.report.count({
                    where: { ...branchFilter, status: "COMPLETED" },
                }),
                prisma.report.count({
                    where: {
                        ...branchFilter,
                        status: {
                            in: [
                                "ESTIMATION_REJECTED",
                                "ESTIMATION_REJECTED_REVISION",
                            ],
                        },
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

export type ActivityItem = {
    id: string;
    reportNumber: string;
    action: string; // ActivityAction enum value
    notes: string | null;
    createdAt: Date;
    actor: { name: string; NIK: string };
    report: { storeName: string; branchName: string };
};

// ── internal helper ───────────────────────────────────────────────────────────

async function fetchActivityLogs(
    where: Parameters<typeof prisma.activityLog.findMany>[0]["where"],
    limit: number,
): Promise<ActivityItem[]> {
    const rows = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            reportNumber: true,
            action: true,
            notes: true,
            createdAt: true,
            actor: { select: { name: true, NIK: true } },
            report: { select: { storeName: true, branchName: true } },
        },
    });
    return rows.map((r) => ({ ...r, action: r.action as string }));
}

// ── public query functions ────────────────────────────────────────────────────

/**
 * Fetch activity log for reports created by a specific BMS user.
 */
export async function getBMSActivity(
    userId: string,
    limit = 5,
): Promise<ActivityItem[]> {
    try {
        return await fetchActivityLogs(
            { report: { createdByNIK: userId } },
            limit,
        );
    } catch (error) {
        logger.error({ operation: "getBMSActivity", userId }, "Failed", error);
        return [];
    }
}

/**
 * Fetch activity log for all reports in the given branches.
 */
export async function getBranchActivity(
    branchNames: string[],
    limit = 5,
): Promise<ActivityItem[]> {
    try {
        return await fetchActivityLogs(
            { report: { branchName: { in: branchNames } } },
            limit,
        );
    } catch (error) {
        logger.error(
            { operation: "getBranchActivity", branchNames },
            "Failed",
            error,
        );
        return [];
    }
}

/**
 * Fetch global activity log (admin).
 */
export async function getGlobalActivity(limit = 5): Promise<ActivityItem[]> {
    try {
        return await fetchActivityLogs({}, limit);
    } catch (error) {
        logger.error({ operation: "getGlobalActivity" }, "Failed", error);
        return [];
    }
}
