import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getOnlineUsers, getTodayActiveUsers } from "@/lib/presence";
import { getReportStatusLabel } from "@/lib/report-status";
import { getReportSlaDays } from "@/lib/app-settings";

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

const MANAGER_ACTIVE_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

export type ManagerDashboardRole = "BMC" | "BNM_MANAGER";

export type ManagerDashboardReport = {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    statusLabel: string;
    createdAt: Date;
    lastActivityAt: Date;
    ownerName: string;
    totalEstimation: number;
    totalReal: number | null;
    ageDays: number;
};

export type ManagerDashboardPjum = {
    id: string;
    weekNumber: number;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    reportCount: number;
    status: string;
    createdAt: Date;
};

export type ManagerDashboardData = {
    branchNames: string[];
    kpi: {
        totalReports: number;
        activeReports: number;
        pendingReports: number;
        completedReports: number;
        completionRate: number;
        pendingPjum: number;
        approvedPjumReportCount: number;
        totalRealisasi: number;
    };
    priorityReports: ManagerDashboardReport[];
    pendingPjums: ManagerDashboardPjum[];
    recentActivity: ActivityItem[];
};

function getManagerPriorityStatuses(role: ManagerDashboardRole) {
    if (role === "BNM_MANAGER") {
        return ["APPROVED_BMC"] as const;
    }

    return ["PENDING_ESTIMATION", "PENDING_REVIEW"] as const;
}

function normalizeManagerBranchNames(branchNames: string[]) {
    return branchNames.filter(
        (branchName) => branchName.trim() !== "",
    );
}

function mapManagerReport(report: {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    createdAt: Date;
    totalEstimation: unknown;
    totalReal: unknown | null;
    createdBy: { name: string };
    activities: { createdAt: Date }[];
}): ManagerDashboardReport {
    const lastActivityAt = report.activities[0]?.createdAt ?? report.createdAt;

    return {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        branchName: report.branchName,
        status: report.status,
        statusLabel: getReportStatusLabel(report.status),
        createdAt: report.createdAt,
        lastActivityAt,
        ownerName: report.createdBy.name,
        totalEstimation: Number(report.totalEstimation ?? 0),
        totalReal: report.totalReal === null ? null : Number(report.totalReal),
        ageDays: calculateAgeDays(lastActivityAt),
    };
}

export async function getManagerDashboardData({
    role,
    branchNames,
}: {
    role: ManagerDashboardRole;
    branchNames: string[];
}): Promise<ManagerDashboardData> {
    const visibleBranches = normalizeManagerBranchNames(branchNames);
    const empty: ManagerDashboardData = {
        branchNames: visibleBranches,
        kpi: {
            totalReports: 0,
            activeReports: 0,
            pendingReports: 0,
            completedReports: 0,
            completionRate: 0,
            pendingPjum: 0,
            approvedPjumReportCount: 0,
            totalRealisasi: 0,
        },
        priorityReports: [],
        pendingPjums: [],
        recentActivity: [],
    };

    if (visibleBranches.length === 0) return empty;

    const priorityStatuses = getManagerPriorityStatuses(role);
    const reportBase = {
        branchName: { in: visibleBranches },
        status: { not: "DRAFT" as const },
    };
    const completedBase = {
        branchName: { in: visibleBranches },
        status: "COMPLETED" as const,
    };

    try {
        const [
            totalReports,
            activeReports,
            pendingReports,
            completedReports,
            pendingPjum,
            approvedPjumRows,
            totalRealisasi,
            priorityRows,
            pendingPjumRows,
            recentActivity,
        ] = await Promise.all([
            prisma.report.count({ where: reportBase }),
            prisma.report.count({
                where: {
                    branchName: { in: visibleBranches },
                    status: { in: [...MANAGER_ACTIVE_REPORT_STATUSES] },
                },
            }),
            prisma.report.count({
                where: {
                    branchName: { in: visibleBranches },
                    status: { in: [...priorityStatuses] },
                },
            }),
            prisma.report.count({ where: completedBase }),
            prisma.pjumExport.count({
                where: {
                    branchName: { in: visibleBranches },
                    status: "PENDING_APPROVAL",
                },
            }),
            prisma.pjumExport.findMany({
                where: {
                    branchName: { in: visibleBranches },
                    status: "APPROVED",
                },
                select: {
                    reportNumbers: true,
                },
            }),
            prisma.report.aggregate({
                where: {
                    ...completedBase,
                    totalReal: { not: null },
                },
                _sum: { totalReal: true },
            }),
            prisma.report.findMany({
                where: {
                    branchName: { in: visibleBranches },
                    status: { in: [...priorityStatuses] },
                },
                orderBy: [{ updatedAt: "asc" }, { reportNumber: "desc" }],
                take: 6,
                select: {
                    reportNumber: true,
                    storeName: true,
                    branchName: true,
                    status: true,
                    createdAt: true,
                    totalEstimation: true,
                    totalReal: true,
                    createdBy: { select: { name: true } },
                    activities: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { createdAt: true },
                    },
                },
            }),
            prisma.pjumExport.findMany({
                where: {
                    branchName: { in: visibleBranches },
                    status: "PENDING_APPROVAL",
                },
                orderBy: [{ createdAt: "asc" }, { id: "desc" }],
                take: 5,
                select: {
                    id: true,
                    weekNumber: true,
                    branchName: true,
                    bmsNIK: true,
                    reportNumbers: true,
                    status: true,
                    createdAt: true,
                },
            }),
            getBranchActivity(visibleBranches, 8),
        ]);

        const pjumBmsNiks = Array.from(
            new Set(pendingPjumRows.map((pjum) => pjum.bmsNIK)),
        );
        const bmsUsers =
            pjumBmsNiks.length > 0
                ? await prisma.user.findMany({
                      where: { NIK: { in: pjumBmsNiks } },
                      select: { NIK: true, name: true },
                  })
                : [];
        const bmsNameMap = new Map(
            bmsUsers.map((user) => [user.NIK, user.name]),
        );

        return {
            branchNames: visibleBranches,
            kpi: {
                totalReports,
                activeReports,
                pendingReports,
                completedReports,
                completionRate:
                    totalReports > 0
                        ? Math.round((completedReports / totalReports) * 100)
                        : 0,
                pendingPjum,
                approvedPjumReportCount: approvedPjumRows.reduce(
                    (sum, pjum) => sum + pjum.reportNumbers.length,
                    0,
                ),
                totalRealisasi: Number(totalRealisasi._sum.totalReal ?? 0),
            },
            priorityReports: priorityRows.map(mapManagerReport),
            pendingPjums: pendingPjumRows.map((pjum) => ({
                id: pjum.id,
                weekNumber: pjum.weekNumber,
                branchName: pjum.branchName,
                bmsNIK: pjum.bmsNIK,
                bmsName: bmsNameMap.get(pjum.bmsNIK) ?? pjum.bmsNIK,
                reportCount: pjum.reportNumbers.length,
                status: pjum.status,
                createdAt: pjum.createdAt,
            })),
            recentActivity,
        };
    } catch (error) {
        logger.error(
            { operation: "getManagerDashboardData", role, branchNames },
            "Failed to fetch manager dashboard data",
            error,
        );
        return empty;
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
        return await fetchActivityLogs(
            { report: { NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } } },
            limit,
        );
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

export async function getAdminVisibleOnlineUserCount(): Promise<number> {
    try {
        const onlineUserIds = await getOnlineUsers();
        if (onlineUserIds.length === 0) return 0;

        return await prisma.user.count({
            where: {
                NIK: { in: onlineUserIds },
                deletedAt: null,
                NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
            },
        });
    } catch (error) {
        logger.error(
            { operation: "getAdminVisibleOnlineUserCount" },
            "Failed",
            error,
        );
        return 0;
    }
}

export type AdminKpiMetric = {
    totalReports: number;
    completedReports: number;
    activeReports: number;
    inProgressReports: number;
    pendingReviewReports: number;
    revisionReports: number;
    completionRate: number;
    totalRealisasi: number;
    avgRealisasi: number;
    avgBmsWeeklyRealisasi: number;
    activeUsers: number;
    unpjumCompletedReports: number;
    pendingPjum: number;
};

export type AdminStatusDatum = {
    status: string;
    label: string;
    count: number;
    slaDays: number | null;
    overdueCount: number;
};

export type AdminTrendDatum = {
    label: string;
    branchName: string;
    completed: number;
    realisasi: number;
    avgRealisasi: number;
    avgBmsWeeklyRealisasi: number;
};

export type AdminTrendPeriod = string;

export type AdminBranchOption = {
    name: string;
};

export type AdminBranchPerformanceDatum = {
    branchName: string;
    totalReports: number;
    completedReports: number;
    openReports: number;
    completionRate: number;
    totalRealisasi: number;
    avgRealisasi: number;
};

export type AdminAttentionReport = {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    statusLabel: string;
    createdAt: Date;
    updatedAt: Date;
    ageDays: number;
    ownerName: string;
};

export type AdminPjumSummary = {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
};

export type AdminCommandCenterData = {
    kpi: AdminKpiMetric;
    status: AdminStatusDatum[];
    trends: AdminTrendDatum[];
    branchOptions: AdminBranchOption[];
    branches: AdminBranchPerformanceDatum[];
    stuckReports: AdminAttentionReport[];
    pjum: AdminPjumSummary;
    recentActivity: ActivityItem[];
};

export type AdminBranchHierarchy = {
    options: AdminBranchOption[];
    parentMap: Map<string, string>;
};

type AdminBranchAccumulator = {
    branchName: string;
    totalReports: number;
    completedReports: number;
    totalRealisasi: number;
};

const ADMIN_STATUS_LABELS: Record<string, string> = {
    PENDING_ESTIMATION: getReportStatusLabel("PENDING_ESTIMATION"),
    ESTIMATION_APPROVED: getReportStatusLabel("ESTIMATION_APPROVED"),
    ESTIMATION_REJECTED_REVISION: getReportStatusLabel(
        "ESTIMATION_REJECTED_REVISION",
    ),
    ESTIMATION_REJECTED: getReportStatusLabel("ESTIMATION_REJECTED"),
    IN_PROGRESS: getReportStatusLabel("IN_PROGRESS"),
    PENDING_REVIEW: getReportStatusLabel("PENDING_REVIEW"),
    APPROVED_BMC: getReportStatusLabel("APPROVED_BMC"),
    REVIEW_REJECTED_REVISION: getReportStatusLabel(
        "REVIEW_REJECTED_REVISION",
    ),
    COMPLETED: getReportStatusLabel("COMPLETED"),
};

const ADMIN_STATUS_ORDER = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "ESTIMATION_REJECTED_REVISION",
    "REVIEW_REJECTED_REVISION",
    "ESTIMATION_REJECTED",
    "COMPLETED",
];

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date): string {
    return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function getDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function getDayLabel(date: Date): string {
    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
    });
}

function getRecentMonthKeys(count: number): { key: string; label: string }[] {
    const months: { key: string; label: string }[] = [];
    const current = new Date();
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(current);
        date.setMonth(current.getMonth() - i);
        months.push({ key: getMonthKey(date), label: getMonthLabel(date) });
    }

    return months;
}

function getYtdMonthKeys(): { key: string; label: string }[] {
    const months: { key: string; label: string }[] = [];
    const now = new Date();

    for (let month = 0; month <= now.getMonth(); month++) {
        const date = new Date(now.getFullYear(), month, 1);
        months.push({ key: getMonthKey(date), label: getMonthLabel(date) });
    }

    return months;
}

function getRecentDayKeys(count: number): { key: string; label: string }[] {
    const days: { key: string; label: string }[] = [];
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(current);
        date.setDate(current.getDate() - i);
        days.push({ key: getDayKey(date), label: getDayLabel(date) });
    }

    return days;
}

function getStartOfRecentMonths(count: number): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - (count - 1));
    return d;
}

function getStartOfRecentDays(count: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (count - 1));
    return d;
}

function getTrendWindow(period: string): {
    start: Date;
    end?: Date;
    buckets: { key: string; label: string }[];
    bucketKey: (date: Date) => string;
} {
    if (/^\d{2}-\d{4}$/.test(period)) {
        const [mStr, yStr] = period.split("-");
        const month = parseInt(mStr, 10) - 1;
        const year = parseInt(yStr, 10);
        
        const start = new Date(year, month, 1);
        const nextMonth = new Date(year, month + 1, 1);
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const current = new Date(start);
        while (current < nextMonth && current <= today) {
            days.push({ key: getDayKey(current), label: getDayLabel(current) });
            current.setDate(current.getDate() + 1);
        }
        
        return {
            start,
            end: nextMonth,
            buckets: days,
            bucketKey: getDayKey,
        };
    }
    if (period === "30d") {
        return {
            start: getStartOfRecentDays(30),
            buckets: getRecentDayKeys(30),
            bucketKey: getDayKey,
        };
    }

    if (period === "90d") {
        return {
            start: getStartOfRecentDays(90),
            buckets: getRecentDayKeys(90),
            bucketKey: getDayKey,
        };
    }

    if (period === "12m") {
        return {
            start: getStartOfRecentMonths(12),
            buckets: getRecentMonthKeys(12),
            bucketKey: getMonthKey,
        };
    }

    return {
        start: getYtdStart(),
        buckets: getYtdMonthKeys(),
        bucketKey: getMonthKey,
    };
}

function calculateAgeDays(date: Date): number {
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / 86_400_000));
}

function getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return d.toISOString().slice(0, 10);
}

function averageMapValues(map: Map<string, number>): number {
    if (map.size === 0) return 0;

    let total = 0;
    for (const value of map.values()) {
        total += value;
    }

    return Math.round(total / map.size);
}

function getEmptyAdminCommandCenterData(): AdminCommandCenterData {
    return {
        kpi: {
            totalReports: 0,
            completedReports: 0,
            activeReports: 0,
            inProgressReports: 0,
            pendingReviewReports: 0,
            revisionReports: 0,
            completionRate: 0,
            totalRealisasi: 0,
            avgRealisasi: 0,
            avgBmsWeeklyRealisasi: 0,
            activeUsers: 0,
            unpjumCompletedReports: 0,
            pendingPjum: 0,
        },
        status: [],
        trends: [],
        branchOptions: [],
        branches: [],
        stuckReports: [],
        pjum: { total: 0, pending: 0, approved: 0, rejected: 0 },
        recentActivity: [],
    };
}

export async function getAdminBranchHierarchy(): Promise<AdminBranchHierarchy> {
    const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { branchNames: true },
    });

    const optionNames = Array.from(
        new Set(
            users
                .map((user) => user.branchNames[0])
                .filter(
                    (name) =>
                        name &&
                        name.trim() !== "" &&
                        name !== EXCLUDED_ADMIN_BRANCH_NAME,
                ),
        ),
    ).sort((a, b) => a.localeCompare(b, "id-ID"));

    const parentMap = new Map<string, string>();
    for (const user of users) {
        const parentBranch = user.branchNames[0];
        if (!parentBranch || parentBranch === EXCLUDED_ADMIN_BRANCH_NAME) {
            continue;
        }

        for (const branchName of user.branchNames) {
            if (!branchName || branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
                continue;
            }
            parentMap.set(branchName, parentBranch);
        }
    }

    return {
        options: optionNames.map((name) => ({ name })),
        parentMap,
    };
}

export async function getAdminVisibleTodayActiveUserCount(): Promise<number> {
    try {
        const activeUserIds = await getTodayActiveUsers();
        if (activeUserIds.length === 0) return 0;

        return await prisma.user.count({
            where: {
                NIK: { in: activeUserIds },
                deletedAt: null,
                NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
            },
        });
    } catch (error) {
        logger.error(
            { operation: "getAdminVisibleTodayActiveUserCount" },
            "Failed",
            error,
        );
        return 0;
    }
}

export async function getAdminBranchOptions(): Promise<AdminBranchOption[]> {
    const hierarchy = await getAdminBranchHierarchy();
    return hierarchy.options;
}

function resolveAdminParentBranch(
    branchName: string,
    hierarchy: AdminBranchHierarchy,
): string {
    return hierarchy.parentMap.get(branchName) ?? branchName;
}

async function getAdminStatusDistribution(
    window: { start: Date; end?: Date },
    slaDaysByStatus: Partial<Record<string, number>>,
): Promise<AdminStatusDatum[]> {
    const statusRows = await prisma.report.groupBy({
        by: ["status"],
        where: {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            status: { not: "DRAFT" },
            createdAt: { 
                gte: window.start,
                ...(window.end ? { lt: window.end } : {})
            },
        },
        _count: { _all: true },
    });

    const statusCountMap = new Map(
        statusRows.map((r) => [r.status, r._count._all]),
    );
    const now = new Date();
    const slaEntries = Object.entries(slaDaysByStatus) as [
        string,
        number,
    ][];
    const overdueEntries = await Promise.all(
        slaEntries.map(async ([status, days]) => {
            const threshold = new Date(now);
            threshold.setDate(threshold.getDate() - days);
            const createdBefore =
                window.end && window.end < threshold ? window.end : threshold;

            const count = await prisma.report.count({
                where: {
                    NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
                    status: status as never,
                    createdAt: {
                        gte: window.start,
                        lt: createdBefore,
                    },
                    activities: {
                        none: {
                            createdAt: { gte: threshold },
                        },
                    },
                },
            });

            return [status, count] as const;
        }),
    );
    const overdueCountMap = new Map(overdueEntries);

    return ADMIN_STATUS_ORDER.map((statusKey) => ({
        status: statusKey,
        label: ADMIN_STATUS_LABELS[statusKey] ?? statusKey,
        count: statusCountMap.get(statusKey as never) ?? 0,
        slaDays: slaDaysByStatus[statusKey] ?? null,
        overdueCount: overdueCountMap.get(statusKey) ?? 0,
    })).filter((item) => item.count > 0);
}

async function getAdminPjumSummary(window: { start: Date; end?: Date }): Promise<AdminPjumSummary> {
    const pjumRows = await prisma.pjumExport.groupBy({
        by: ["status"],
        where: {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            createdAt: { 
                gte: window.start,
                ...(window.end ? { lt: window.end } : {})
            },
        },
        _count: { _all: true },
    });

    const pjumCountMap = new Map(
        pjumRows.map((r) => [r.status, r._count._all]),
    );

    return {
        pending: pjumCountMap.get("PENDING_APPROVAL") ?? 0,
        approved: pjumCountMap.get("APPROVED") ?? 0,
        rejected: pjumCountMap.get("REJECTED") ?? 0,
        total: pjumRows.reduce((sum, row) => sum + row._count._all, 0),
    };
}

async function getAdminKpiMetric(
    window: { start: Date; end?: Date },
    activeUsers: number,
    pendingPjum: number,
): Promise<AdminKpiMetric> {
    const baseWhere = {
        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        status: { not: "DRAFT" as const },
        createdAt: { 
            gte: window.start,
            ...(window.end ? { lt: window.end } : {})
        },
    };
    const completedWhere = {
        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        status: "COMPLETED" as const,
        finishedAt: { 
            gte: window.start,
            ...(window.end ? { lt: window.end } : {})
        },
    };

    const [
        totalReports,
        completedReports,
        inProgressReports,
        pendingReviewReports,
        revisionReports,
        unpjumCompletedReports,
        totalRealisasi,
        avgRealisasi,
        bmsWeeklyRows,
    ] = await Promise.all([
        prisma.report.count({ where: baseWhere }),
        prisma.report.count({ where: completedWhere }),
        prisma.report.count({
            where: {
                ...baseWhere,
                status: { in: ["ESTIMATION_APPROVED", "IN_PROGRESS"] },
            },
        }),
        prisma.report.count({
            where: {
                ...baseWhere,
                status: {
                    in: ["PENDING_ESTIMATION", "PENDING_REVIEW", "APPROVED_BMC"],
                },
            },
        }),
        prisma.report.count({
            where: {
                ...baseWhere,
                status: {
                    in: [
                        "ESTIMATION_REJECTED_REVISION",
                        "REVIEW_REJECTED_REVISION",
                    ],
                },
            },
        }),
        prisma.report.count({
            where: {
                ...completedWhere,
                pjumExportedAt: null,
            },
        }),
        prisma.report.aggregate({
            where: {
                ...completedWhere,
                pjumExportedAt: { not: null },
                totalReal: { not: null },
            },
            _sum: { totalReal: true },
        }),
        prisma.report.aggregate({
            where: {
                ...completedWhere,
                pjumExportedAt: { not: null },
                totalReal: { not: null },
            },
            _avg: { totalReal: true },
        }),
        prisma.report.findMany({
            where: {
                ...completedWhere,
                pjumExportedAt: { not: null },
                totalReal: { not: null },
            },
            select: {
                createdByNIK: true,
                finishedAt: true,
                totalReal: true,
            },
        }),
    ]);

    const bmsWeekTotals = new Map<string, number>();
    for (const row of bmsWeeklyRows) {
        if (!row.finishedAt) continue;

        const key = `${row.createdByNIK}:${getWeekKey(row.finishedAt)}`;
        bmsWeekTotals.set(
            key,
            (bmsWeekTotals.get(key) ?? 0) + Number(row.totalReal ?? 0),
        );
    }

    return {
        totalReports,
        completedReports,
        activeReports:
            inProgressReports + pendingReviewReports + revisionReports,
        inProgressReports,
        pendingReviewReports,
        revisionReports,
        completionRate:
            totalReports > 0
                ? Math.round((completedReports / totalReports) * 100)
                : 0,
        totalRealisasi: Number(totalRealisasi._sum.totalReal ?? 0),
        avgRealisasi: Number(avgRealisasi._avg.totalReal ?? 0),
        avgBmsWeeklyRealisasi: averageMapValues(bmsWeekTotals),
        activeUsers,
        unpjumCompletedReports,
        pendingPjum,
    };
}

function getBranchAccumulator(
    map: Map<string, AdminBranchAccumulator>,
    branchName: string,
): AdminBranchAccumulator {
    const current = map.get(branchName);
    if (current) return current;

    const next = {
        branchName,
        totalReports: 0,
        completedReports: 0,
        totalRealisasi: 0,
    };
    map.set(branchName, next);
    return next;
}

async function getAdminBranchPerformance(
    window: { start: Date; end?: Date },
    hierarchy: AdminBranchHierarchy,
): Promise<AdminBranchPerformanceDatum[]> {
    const [totalRows, completedRows] = await Promise.all([
        prisma.report.groupBy({
            by: ["branchName"],
            where: {
                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
                status: { not: "DRAFT" },
                createdAt: { 
                    gte: window.start,
                    ...(window.end ? { lt: window.end } : {})
                },
            },
            _count: { _all: true },
        }),
        prisma.report.groupBy({
            by: ["branchName"],
            where: {
                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
                status: "COMPLETED",
                pjumExportedAt: { not: null },
                finishedAt: { 
                    gte: window.start,
                    ...(window.end ? { lt: window.end } : {})
                },
            },
            _count: { _all: true },
            _sum: { totalReal: true },
        }),
    ]);

    const branchMap = new Map<string, AdminBranchAccumulator>();
    for (const option of hierarchy.options) {
        getBranchAccumulator(branchMap, option.name);
    }

    for (const row of totalRows) {
        const parentBranch = resolveAdminParentBranch(
            row.branchName,
            hierarchy,
        );
        getBranchAccumulator(branchMap, parentBranch).totalReports +=
            row._count._all;
    }

    for (const row of completedRows) {
        const parentBranch = resolveAdminParentBranch(
            row.branchName,
            hierarchy,
        );
        const current = getBranchAccumulator(branchMap, parentBranch);
        current.completedReports += row._count._all;
        current.totalRealisasi += Number(row._sum.totalReal ?? 0);
    }

    return Array.from(branchMap.values())
        .map((branch) => ({
            branchName: branch.branchName,
            totalReports: branch.totalReports,
            completedReports: branch.completedReports,
            openReports: branch.totalReports - branch.completedReports,
            completionRate:
                branch.totalReports > 0
                    ? Math.round(
                          (branch.completedReports / branch.totalReports) *
                              100,
                      )
                    : 0,
            totalRealisasi: branch.totalRealisasi,
            avgRealisasi:
                branch.completedReports > 0
                    ? Math.round(
                          branch.totalRealisasi / branch.completedReports,
                      )
                    : 0,
        }))
        .sort(
            (a, b) =>
                b.openReports - a.openReports ||
                b.totalReports - a.totalReports,
        )
        .slice(0, 8);
}

async function getAdminBranchTrend(
    period: AdminTrendPeriod,
    hierarchy: AdminBranchHierarchy,
): Promise<AdminTrendDatum[]> {
    const trendWindow = getTrendWindow(period);
    const trendRows = await prisma.report.findMany({
        where: {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            status: "COMPLETED",
            pjumExportedAt: { not: null },
            finishedAt: { 
                gte: trendWindow.start,
                ...(trendWindow.end ? { lt: trendWindow.end } : {})
            },
        },
        select: {
            branchName: true,
            totalReal: true,
            finishedAt: true,
            createdByNIK: true,
        },
    });

    const trendMap = new Map(
        hierarchy.options.map((branch) => [
            branch.name,
            {
                label: branch.name,
                branchName: branch.name,
                completed: 0,
                realisasi: 0,
                avgRealisasi: 0,
                avgBmsWeeklyRealisasi: 0,
                bmsWeekTotals: new Map<string, number>(),
            },
        ]),
    );

    for (const row of trendRows) {
        const parentBranch = resolveAdminParentBranch(
            row.branchName,
            hierarchy,
        );
        const current = trendMap.get(parentBranch);
        if (!current) continue;

        const realisasi = Number(row.totalReal ?? 0);
        current.completed += 1;
        current.realisasi += realisasi;

        if (row.finishedAt) {
            const bmsWeekKey = `${row.createdByNIK}:${getWeekKey(row.finishedAt)}`;
            current.bmsWeekTotals.set(
                bmsWeekKey,
                (current.bmsWeekTotals.get(bmsWeekKey) ?? 0) + realisasi,
            );
        }
    }

    return Array.from(trendMap.values()).map((row) => ({
        label: row.label,
        branchName: row.branchName,
        completed: row.completed,
        realisasi: row.realisasi,
        avgRealisasi:
            row.completed > 0 ? Math.round(row.realisasi / row.completed) : 0,
        avgBmsWeeklyRealisasi: averageMapValues(row.bmsWeekTotals),
    }));
}

function mapAdminAttentionReport(report: {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    activities: { createdAt: Date }[];
    createdBy: { name: string };
}): AdminAttentionReport {
    const lastActivityAt = report.activities[0]?.createdAt ?? report.createdAt;

    return {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        branchName: report.branchName,
        status: report.status,
        statusLabel: ADMIN_STATUS_LABELS[report.status] ?? report.status,
        createdAt: report.createdAt,
        updatedAt: lastActivityAt,
        ageDays: calculateAgeDays(lastActivityAt),
        ownerName: report.createdBy.name,
    };
}

async function getAdminStuckReports(
    slaDaysByStatus: Partial<Record<string, number>>,
): Promise<AdminAttentionReport[]> {
    const now = new Date();
    const slaEntries = Object.entries(slaDaysByStatus) as [
        string,
        number,
    ][];

    const stuckReports = await prisma.report.findMany({
        where: {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            OR: slaEntries.map(([status, days]) => {
                const threshold = new Date(now);
                threshold.setDate(threshold.getDate() - days);

                return {
                    status: status as never,
                    createdAt: { lt: threshold },
                    activities: {
                        none: {
                            createdAt: { gte: threshold },
                        },
                    },
                };
            }),
        },
        orderBy: [{ updatedAt: "asc" }],
        take: 8,
        select: {
            reportNumber: true,
            storeName: true,
            branchName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { name: true } },
            activities: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { createdAt: true },
            },
        },
    });

    return stuckReports.map(mapAdminAttentionReport);
}

/**
 * ADMIN command-center data for the dashboard.
 * Combines operational backlog, branch performance, trend, PJUM, and activity data.
 */
export async function getAdminCommandCenterData(
    period: AdminTrendPeriod = "ytd",
): Promise<AdminCommandCenterData> {
    const trendWindow = getTrendWindow(period);
    const empty = getEmptyAdminCommandCenterData();

    try {
        const slaDaysByStatus = await getReportSlaDays();
        const [activeUsers, hierarchy, status, pjum, recentActivity] =
            await Promise.all([
            getAdminVisibleTodayActiveUserCount(),
            getAdminBranchHierarchy(),
            getAdminStatusDistribution(trendWindow, slaDaysByStatus),
            getAdminPjumSummary(trendWindow),
            getGlobalActivity(8),
        ]);

        const [kpi, branches, trends, stuckReports] =
            await Promise.all([
            getAdminKpiMetric(trendWindow, activeUsers, pjum.pending),
            getAdminBranchPerformance(trendWindow, hierarchy),
            getAdminBranchTrend(period, hierarchy),
            getAdminStuckReports(slaDaysByStatus),
        ]);

        return {
            kpi,
            status,
            trends,
            branchOptions: hierarchy.options,
            branches,
            stuckReports,
            pjum,
            recentActivity,
        };
    } catch (error) {
        logger.error(
            { operation: "getAdminCommandCenterData" },
            "Failed",
            error,
        );
        return empty;
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
                NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
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
