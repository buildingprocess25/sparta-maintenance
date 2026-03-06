import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Fetch report statistics for a BMS user (their own reports, all time).
 * - needsAction: Laporan yang perlu ditindak BMS sekarang
 * - waitingReview: Laporan yang menunggu pihak lain
 * - inProgress: Laporan sedang dikerjakan
 * - completed: Laporan yang sudah selesai
 */
export async function getUserStats(userId: string) {
    try {
        const base = { createdByNIK: userId };

        const [
            totalReports,
            needsAction,
            waitingReview,
            inProgress,
            completed,
        ] = await Promise.all([
            prisma.report.count({ where: base }),
            // Things BMS must act on (start work / revise)
            prisma.report.count({
                where: {
                    ...base,
                    status: {
                        in: [
                            "ESTIMATION_APPROVED",
                            "ESTIMATION_REJECTED_REVISION",
                            "REVIEW_REJECTED_REVISION",
                        ],
                    },
                },
            }),
            // Waiting for others (BMC / BNM)
            prisma.report.count({
                where: {
                    ...base,
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
                where: { ...base, status: "IN_PROGRESS" },
            }),
            prisma.report.count({
                where: { ...base, status: "COMPLETED" },
            }),
        ]);

        return {
            totalReports,
            needsAction,
            waitingReview,
            inProgress,
            completed,
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
 * - needsReview: Laporan yang perlu ditinjau BMC (estimasi / penyelesaian)
 * - inProgress: Laporan yang sedang dikerjakan BMS
 * - awaitingFinal: Sudah diapprove BMC, menunggu BnM Manager
 * - completed: Selesai
 */
export async function getBMCStats(branchNames: string[]) {
    try {
        const base = {
            branchName: { in: branchNames },
            status: { not: "DRAFT" as const },
        };

        const [
            totalReports,
            needsReview,
            inProgress,
            awaitingFinal,
            completed,
        ] = await Promise.all([
            prisma.report.count({ where: base }),
            // Things BMC must act on: review estimation OR review completion
            prisma.report.count({
                where: {
                    branchName: { in: branchNames },
                    status: { in: ["PENDING_ESTIMATION", "PENDING_REVIEW"] },
                },
            }),
            // Estimation approved + actively being worked on
            prisma.report.count({
                where: {
                    branchName: { in: branchNames },
                    status: { in: ["ESTIMATION_APPROVED", "IN_PROGRESS"] },
                },
            }),
            prisma.report.count({
                where: {
                    branchName: { in: branchNames },
                    status: "APPROVED_BMC",
                },
            }),
            prisma.report.count({
                where: { branchName: { in: branchNames }, status: "COMPLETED" },
            }),
        ]);

        return {
            totalReports,
            needsReview,
            inProgress,
            awaitingFinal,
            completed,
        };
    } catch (error) {
        logger.error(
            { operation: "getBMCStats", branchNames },
            "Failed to fetch BMC stats",
            error,
        );
        throw error;
    }
}

/**
 * Fetch report statistics for a BnM Manager, scoped to their branches.
 * - awaitingApproval: Laporan yang menunggu persetujuan final
 * - completed: Laporan yang sudah selesai
 * - totalReports: Semua laporan (non-draft) di branch
 */
export async function getBNMStats(branchNames: string[]) {
    try {
        const [awaitingApproval, completed, totalReports] = await Promise.all([
            prisma.report.count({
                where: {
                    branchName: { in: branchNames },
                    status: "APPROVED_BMC",
                },
            }),
            prisma.report.count({
                where: { branchName: { in: branchNames }, status: "COMPLETED" },
            }),
            prisma.report.count({
                where: {
                    branchName: { in: branchNames },
                    status: { not: "DRAFT" },
                },
            }),
        ]);

        return { awaitingApproval, completed, totalReports };
    } catch (error) {
        logger.error(
            { operation: "getBNMStats", branchNames },
            "Failed to fetch BNM stats",
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
    where: NonNullable<
        Parameters<typeof prisma.activityLog.findMany>[0]
    >["where"],
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
