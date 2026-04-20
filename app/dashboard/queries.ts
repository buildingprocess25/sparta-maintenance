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
            // Waiting for others (BMC)
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
 * - completed: Selesai
 */
export async function getBMCStats(branchNames: string[]) {
    try {
        const base = {
            branchName: { in: branchNames },
            status: { not: "DRAFT" as const },
        };

        const [totalReports, needsReview, inProgress, completed] =
            await Promise.all([
                prisma.report.count({ where: base }),
                // Things BMC must act on: review estimation OR review completion
                prisma.report.count({
                    where: {
                        branchName: { in: branchNames },
                        status: {
                            in: ["PENDING_ESTIMATION", "PENDING_REVIEW"],
                        },
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
                        status: "COMPLETED",
                    },
                }),
            ]);

        return {
            totalReports,
            needsReview,
            inProgress,
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
 * - completed: Laporan yang sudah selesai
 * - totalReports: Semua laporan (non-draft) di branch
 */
export async function getBNMStats(branchNames: string[]) {
    try {
        const [pendingFinalApproval, completed, totalReports] =
            await Promise.all([
                prisma.report.count({
                    where: {
                        branchName: { in: branchNames },
                        status: "APPROVED_BMC",
                    },
                }),
                prisma.report.count({
                    where: {
                        branchName: { in: branchNames },
                        status: "COMPLETED",
                    },
                }),
                prisma.report.count({
                    where: {
                        branchName: { in: branchNames },
                        status: { not: "DRAFT" },
                    },
                }),
            ]);

        return { pendingFinalApproval, completed, totalReports };
    } catch (error) {
        logger.error(
            { operation: "getBNMStats", branchNames },
            "Failed to fetch BNM stats",
            error,
        );
        throw error;
    }
}

/**
 * Count PJUM exports pending BnM Manager approval.
 */
export async function getPendingPjumCount(
    branchNames: string[],
): Promise<number> {
    try {
        return await prisma.pjumExport.count({
            where: {
                branchName: { in: branchNames },
                status: "PENDING_APPROVAL",
            },
        });
    } catch (error) {
        logger.error(
            { operation: "getPendingPjumCount", branchNames },
            "Failed",
            error,
        );
        return 0;
    }
}

export type ActivityItem = {
    id: string;
    reportNumber: string;
    action: string; // ActivityAction enum value
    notes: string | null;
    createdAt: Date;
    actor: { name: string; NIK: string };
    report: { 
        storeName: string; 
        branchName: string;
        status: string;
        completedPdfPath: string | null;
        reportFinalDriveUrl: string | null;
    };
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
            report: { select: { 
                storeName: true, 
                branchName: true, 
                status: true,
                completedPdfPath: true,
                reportFinalDriveUrl: true
            } },
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

export type PjumActivityItem = {
    id: string;
    label: string;
    action: string;
    createdAt: Date;
    actor: { name: string; NIK: string };
    branchName: string;
};

/**
 * Fetch activity for PJUM exports in the given branches.
 * Returns both created and approved activities based on status/timestamps.
 */
export async function getPjumActivity(
    branchNames: string[],
    limit = 5,
): Promise<PjumActivityItem[]> {
    try {
        const exports = await prisma.pjumExport.findMany({
            where: { branchName: { in: branchNames } },
            orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
            take: limit,
        });

        // Collect unique NIKs
        const niks = new Set<string>();
        exports.forEach((e) => {
            niks.add(e.createdByNIK);
            if (e.approvedByNIK) niks.add(e.approvedByNIK);
        });

        // Fetch user records to get actual names
        const users = await prisma.user.findMany({
            where: { NIK: { in: Array.from(niks) } },
            select: { NIK: true, name: true },
        });
        const userMap = new Map(users.map((u) => [u.NIK, u.name]));

        const activities: PjumActivityItem[] = [];

        for (const pjum of exports) {
            // Include created activity
            activities.push({
                id: `${pjum.id}-created`,
                label: `PJUM Minggu ke-${pjum.weekNumber}`,
                action: "PJUM_CREATED",
                createdAt: pjum.createdAt,
                actor: {
                    name: userMap.get(pjum.createdByNIK) ?? pjum.createdByNIK,
                    NIK: pjum.createdByNIK,
                },
                branchName: pjum.branchName,
            });

            // If approved, also include approved activity
            if (
                pjum.status === "APPROVED" &&
                pjum.approvedAt &&
                pjum.approvedByNIK
            ) {
                activities.push({
                    id: `${pjum.id}-approved`,
                    label: `PJUM Minggu ke-${pjum.weekNumber}`,
                    action: "PJUM_APPROVED",
                    createdAt: pjum.approvedAt,
                    actor: {
                        name:
                            userMap.get(pjum.approvedByNIK) ??
                            pjum.approvedByNIK,
                        NIK: pjum.approvedByNIK,
                    },
                    branchName: pjum.branchName,
                });
            }
        }

        // Sort combined activities and limit
        return activities
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    } catch (error) {
        logger.error(
            { operation: "getPjumActivity", branchNames },
            "Failed",
            error,
        );
        return [];
    }
}

/**
 * Fetch BMC's own approval/rejection actions (estimation & work completion).
 */
export async function getBMCApprovalHistory(
    actorNIK: string,
    limit = 500,
): Promise<ActivityItem[]> {
    const BMC_ACTIONS = [
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED",
        "ESTIMATION_REJECTED_REVISION",
        "WORK_APPROVED",
        "WORK_REJECTED_REVISION",
    ];
    try {
        return await fetchActivityLogs(
            { actorNIK, action: { in: BMC_ACTIONS as never[] } },
            limit,
        );
    } catch (error) {
        logger.error(
            { operation: "getBMCApprovalHistory", actorNIK },
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

// ─── Admin Global Monitoring ──────────────────────────────────────────────────

export type GlobalStats = {
    totalReports: number;
    completed: number;
    inProgress: number;
    totalEstimation: number;
    totalReal: number;
};

/**
 * Aggregate global stats across all branches (non-draft reports only).
 */
export async function getGlobalStats(): Promise<GlobalStats> {
    try {
        const base = { status: { not: "DRAFT" as const } };

        const [totalReports, completed, inProgress, sums] = await Promise.all([
            prisma.report.count({ where: base }),
            prisma.report.count({ where: { status: "COMPLETED" } }),
            prisma.report.count({ where: { status: "IN_PROGRESS" } }),
            prisma.report.aggregate({
                where: base,
                _sum: { totalEstimation: true, totalReal: true },
            }),
        ]);

        return {
            totalReports,
            completed,
            inProgress,
            totalEstimation: Number(sums._sum.totalEstimation ?? 0),
            totalReal: Number(sums._sum.totalReal ?? 0),
        };
    } catch (error) {
        logger.error({ operation: "getGlobalStats" }, "Failed", error);
        return { totalReports: 0, completed: 0, inProgress: 0, totalEstimation: 0, totalReal: 0 };
    }
}

export type BranchStat = {
    branchName: string;
    total: number;
    completed: number;
    inProgress: number;
    totalEstimation: number;
    totalReal: number;
};

/**
 * Per-branch aggregate stats (non-draft reports).
 */
export async function getPerBranchStats(): Promise<BranchStat[]> {
    try {
        // Use Store as master branch list — all branches always appear
        // even if they have zero reports yet.
        const [allBranches, reportRows, completedRows, inProgressRows] =
            await Promise.all([
                prisma.store.groupBy({
                    by: ["branchName"],
                    orderBy: { branchName: "asc" },
                }),
                prisma.report.groupBy({
                    by: ["branchName"],
                    where: { status: { not: "DRAFT" } },
                    _count: { _all: true },
                    _sum: { totalEstimation: true, totalReal: true },
                }),
                prisma.report.groupBy({
                    by: ["branchName"],
                    where: { status: "COMPLETED" },
                    _count: { _all: true },
                }),
                prisma.report.groupBy({
                    by: ["branchName"],
                    where: { status: "IN_PROGRESS" },
                    _count: { _all: true },
                }),
            ]);

        const totalMap = new Map(
            reportRows.map((r) => [
                r.branchName,
                {
                    total: r._count._all,
                    totalEstimation: Number(r._sum.totalEstimation ?? 0),
                    totalReal: Number(r._sum.totalReal ?? 0),
                },
            ]),
        );
        const completedMap = new Map(
            completedRows.map((r) => [r.branchName, r._count._all]),
        );
        const inProgressMap = new Map(
            inProgressRows.map((r) => [r.branchName, r._count._all]),
        );

        return allBranches.map((b) => {
            const totals = totalMap.get(b.branchName);
            return {
                branchName: b.branchName,
                total: totals?.total ?? 0,
                completed: completedMap.get(b.branchName) ?? 0,
                inProgress: inProgressMap.get(b.branchName) ?? 0,
                totalEstimation: totals?.totalEstimation ?? 0,
                totalReal: totals?.totalReal ?? 0,
            };
        });
    } catch (error) {
        logger.error({ operation: "getPerBranchStats" }, "Failed", error);
        return [];
    }
}

export type MonthlyTrendPoint = {
    month: string;
    total: number;
    completed: number;
};

/**
 * Monthly report trend for the last 6 months (non-draft).
 * Returns data points ordered oldest to newest.
 */
export async function getMonthlyTrend(): Promise<MonthlyTrendPoint[]> {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const reports = await prisma.report.findMany({
            where: { status: { not: "DRAFT" }, createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true, status: true },
        });

        const MONTH_LABELS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
        const buckets = new Map<string, MonthlyTrendPoint>();

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            buckets.set(key, { month: MONTH_LABELS[d.getMonth()], total: 0, completed: 0 });
        }

        for (const r of reports) {
            const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
            const bucket = buckets.get(key);
            if (!bucket) continue;
            bucket.total++;
            if (r.status === "COMPLETED") bucket.completed++;
        }

        return Array.from(buckets.values());
    } catch (error) {
        logger.error({ operation: "getMonthlyTrend" }, "Failed", error);
        return [];
    }
}
