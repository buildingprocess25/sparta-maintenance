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
            report: {
                select: {
                    storeName: true,
                    branchName: true,
                    status: true,
                    completedPdfPath: true,
                    reportFinalDriveUrl: true,
                },
            },
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
 * Fetch global activity log (for /activity page, ADMIN role).
 */
export async function getGlobalActivity(limit = 5): Promise<ActivityItem[]> {
    try {
        return await fetchActivityLogs({}, limit);
    } catch (error) {
        logger.error({ operation: "getGlobalActivity" }, "Failed", error);
        return [];
    }
}

// ─── YTD helper ───────────────────────────────────────────────────────────────

function getYtdStart(): Date {
    const d = new Date();
    d.setMonth(0);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export type AdminOverviewStats = {
    totalReports: number;
    completed: number;
    activeUsers: number;
    avgRealisasi: number;
};

export type BranchChartData = {
    cabang: string;
    total: number;
    totalRealisasi: number;
};

/**
 * Aggregate stats for the Admin dashboard overview cards — Year-to-Date window.
 * - totalReports: all non-draft reports since 1 Jan this year
 * - completed: COMPLETED reports since 1 Jan this year
 * - activeUsers: count passed in from in-memory presence store
 * - avgRealisasi: average totalReal across COMPLETED reports (YTD)
 */
export async function getAdminOverviewStats(
    activeUsers: number,
): Promise<AdminOverviewStats> {
    const ytdStart = getYtdStart();
    try {
        const [totalReports, completed, avgResult] = await Promise.all([
            prisma.report.count({
                where: {
                    status: { not: "DRAFT" },
                    createdAt: { gte: ytdStart },
                },
            }),
            prisma.report.count({
                where: { status: "COMPLETED", createdAt: { gte: ytdStart } },
            }),
            prisma.report.aggregate({
                where: {
                    status: "COMPLETED",
                    totalReal: { not: null },
                    createdAt: { gte: ytdStart },
                },
                _avg: { totalReal: true },
            }),
        ]);

        return {
            totalReports,
            completed,
            activeUsers,
            avgRealisasi: Number(avgResult._avg.totalReal ?? 0),
        };
    } catch (error) {
        logger.error({ operation: "getAdminOverviewStats" }, "Failed", error);
        return { totalReports: 0, completed: 0, activeUsers, avgRealisasi: 0 };
    }
}

/**
 * Per-branch chart data for the Admin dashboard — Year-to-Date window.
 * - total: total non-draft reports per branch (YTD)
 * - totalRealisasi: sum of totalReal per branch (YTD, COMPLETED only)
 */
export async function getAdminBranchChartData(): Promise<BranchChartData[]> {
    const ytdStart = getYtdStart();
    try {
        const [allBranches, totalRows, totalRealisasiRows] = await Promise.all([
            prisma.store.groupBy({
                by: ["branchName"],
                orderBy: { branchName: "asc" },
            }),
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    status: { not: "DRAFT" },
                    createdAt: { gte: ytdStart },
                },
                _count: { _all: true },
            }),
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    status: "COMPLETED",
                    totalReal: { not: null },
                    createdAt: { gte: ytdStart },
                },
                _sum: { totalReal: true },
            }),
        ]);

        const totalMap = new Map(
            totalRows.map((r) => [r.branchName, r._count._all]),
        );

        const totalRealisasiMap = new Map(
            totalRealisasiRows.map((r) => [
                r.branchName,
                Number(r._sum.totalReal ?? 0),
            ]),
        );

        return allBranches.map((b) => ({
            cabang: b.branchName,
            total: totalMap.get(b.branchName) ?? 0,
            totalRealisasi: totalRealisasiMap.get(b.branchName) ?? 0,
        }));
    } catch (error) {
        logger.error({ operation: "getAdminBranchChartData" }, "Failed", error);
        return [];
    }
}

// ─── Realisasi Detail (YTD) ────────────────────────────────────────────────────

export type RealisasiBranchStat = {
    branchName: string;
    count: number;
    avg: number;
    max: number;
    min: number;
};

export type RealisasiMonthStat = {
    yearMonth: string; // "2025-01"
    label: string; // "Jan 2025"
    count: number;
    avg: number;
};

export type AdminRealisasiDetail = {
    globalAvg: number;
    totalCompleted: number;
    byBranch: RealisasiBranchStat[];
    byMonth: RealisasiMonthStat[];
    byMonthByBranch: Record<string, RealisasiMonthStat[]>;
};

const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
];

/**
 * Returns detailed avg realisasi breakdown — per branch and per month (YTD).
 */
export async function getAdminRealisasiDetail(): Promise<AdminRealisasiDetail> {
    const ytdStart = getYtdStart();
    const empty: AdminRealisasiDetail = {
        globalAvg: 0,
        totalCompleted: 0,
        byBranch: [],
        byMonth: [],
        byMonthByBranch: {},
    };

    try {
        const rows = await prisma.report.findMany({
            where: {
                status: "COMPLETED",
                totalReal: { not: null },
                createdAt: { gte: ytdStart },
            },
            select: { branchName: true, totalReal: true, createdAt: true },
        });

        if (rows.length === 0) return empty;

        const branchMap = new Map<string, number[]>();
        const monthMap = new Map<string, number[]>();
        const branchMonthMap = new Map<string, Map<string, number[]>>();

        for (const r of rows) {
            const val = Number(r.totalReal ?? 0);
            if (!branchMap.has(r.branchName)) branchMap.set(r.branchName, []);
            branchMap.get(r.branchName)!.push(val);

            const d = r.createdAt;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!monthMap.has(key)) monthMap.set(key, []);
            monthMap.get(key)!.push(val);

            if (!branchMonthMap.has(r.branchName)) {
                branchMonthMap.set(r.branchName, new Map());
            }
            const branchMonth = branchMonthMap.get(r.branchName)!;
            if (!branchMonth.has(key)) branchMonth.set(key, []);
            branchMonth.get(key)!.push(val);
        }

        const byBranch: RealisasiBranchStat[] = Array.from(branchMap.entries())
            .map(([branchName, vals]) => ({
                branchName,
                count: vals.length,
                avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
                max: Math.max(...vals),
                min: Math.min(...vals),
            }))
            .sort((a, b) => b.avg - a.avg);

        // Build ordered list from Jan to current month
        const now = new Date();
        const buildMonthStats = (
            source: Map<string, number[]>,
        ): RealisasiMonthStat[] => {
            const stats: RealisasiMonthStat[] = [];
            for (let m = 0; m <= now.getMonth(); m++) {
                const key = `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
                const vals = source.get(key) ?? [];
                stats.push({
                    yearMonth: key,
                    label: `${MONTH_LABELS[m]} ${now.getFullYear()}`,
                    count: vals.length,
                    avg:
                        vals.length > 0
                            ? Math.round(
                                  vals.reduce((s, v) => s + v, 0) / vals.length,
                              )
                            : 0,
                });
            }
            return stats;
        };

        const byMonth = buildMonthStats(monthMap);
        const byMonthByBranch: Record<string, RealisasiMonthStat[]> = {};
        for (const { branchName } of byBranch) {
            const branchMonths = branchMonthMap.get(branchName) ?? new Map();
            byMonthByBranch[branchName] = buildMonthStats(branchMonths);
        }

        const allVals = rows.map((r) => Number(r.totalReal ?? 0));
        const globalAvg = Math.round(
            allVals.reduce((s, v) => s + v, 0) / allVals.length,
        );

        return {
            globalAvg,
            totalCompleted: rows.length,
            byBranch,
            byMonth,
            byMonthByBranch,
        };
    } catch (error) {
        logger.error({ operation: "getAdminRealisasiDetail" }, "Failed", error);
        return empty;
    }
}
