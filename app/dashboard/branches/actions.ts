"use server";

import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/authorization";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getActivityPeriodWindow } from "@/lib/admin-activity-period";
import {
    BRANCH_OPEN_REPORT_STATUSES,
    calculateBranchCompletionRate,
    getBranchStuckThresholdDate,
} from "@/lib/admin-branches";
import { logger } from "@/lib/logger";
import { getReportStatusLabel } from "@/lib/report-status";
import { requiresPjum } from "@/lib/realisasi";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/authorization";

export type AdminBranchSummary = {
    totalBranches: number;
    totalReports: number;
    completedReports: number;
    openReports: number;
    stuckReports: number;
    unpjumCompletedReports: number;
    completionRate: number;
};

export type AdminBranchRow = {
    branchName: string;
    activeStores: number;
    bmsUsers: number;
    bmcUsers: number;
    bnmUsers: number;
    reportCount: number;
    completedCount: number;
    completionRate: number;
    openReports: number;
    stuckReports: number;
    unpjumCompletedReports: number;
    totalRealisasi: number;
    avgRealisasi: number;
    lastActivityAt: Date | null;
};

export type AdminBranchesData = {
    summary: AdminBranchSummary;
    branches: AdminBranchRow[];
};

export type AdminBranchStatusDatum = {
    status: string;
    label: string;
    count: number;
};

export type AdminBranchBmsDatum = {
    nik: string;
    name: string;
    completedCount: number;
    totalRealisasi: number;
    avgRealisasi: number;
};

export type AdminBranchReportItem = {
    reportNumber: string;
    storeName: string;
    status: string;
    statusLabel: string;
    updatedAt: Date;
    finishedAt: Date | null;
    totalReal: number | null;
    ageDays: number;
};

export type AdminBranchActivityItem = {
    id: string;
    reportNumber: string;
    storeName: string;
    action: string;
    actorName: string;
    createdAt: Date;
};

export type AdminBranchDetail = {
    branch: AdminBranchRow;
    status: AdminBranchStatusDatum[];
    topBms: AdminBranchBmsDatum[];
    stuckReports: AdminBranchReportItem[];
    unpjumReports: AdminBranchReportItem[];
    recentActivity: AdminBranchActivityItem[];
};

type CountRow = {
    branchName: string;
    _count: { _all: number };
};

type CompletedRow = CountRow & {
    _sum: { totalReal: Prisma.Decimal | null };
};

type BranchActivityRow = {
    branchName: string;
    lastActivityAt: Date;
};

type UserRoleCountRow = {
    branchName: string | null;
    role: string;
    count: number;
};

function buildDateFilter(window: { start: Date; end?: Date }) {
    return {
        gte: window.start,
        ...(window.end ? { lt: window.end } : {}),
    };
}

function mapCountRows(rows: CountRow[]) {
    return new Map(rows.map((row) => [row.branchName, row._count._all]));
}

function mapRequiredUnpjumRows(
    rows: Array<{ branchName: string; totalReal: unknown; items: unknown }>,
) {
    const map = new Map<string, number>();

    for (const row of rows) {
        if (!requiresPjum(row.totalReal, row.items)) continue;
        map.set(row.branchName, (map.get(row.branchName) ?? 0) + 1);
    }

    return map;
}

function calculateAgeDays(date: Date): number {
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

async function requireBranchMonitor() {
    const user = await getAuthUser();
    if (
        !user ||
        !["ADMIN", "BMC", "BNM_MANAGER"].includes(user.role)
    ) {
        throw new Error("Unauthorized");
    }
    return user;
}

async function getVisibleBranchNames(user: AuthUser) {
    if (user.role === "ADMIN") {
        return fetchAllBranchNames();
    }

    return [...new Set(user.branchNames)]
        .map((branchName) => branchName.trim())
        .filter((branchName) => branchName.length > 0)
        .sort((a, b) => a.localeCompare(b, "id-ID"));
}

function emptySummary(totalBranches = 0): AdminBranchSummary {
    return {
        totalBranches,
        totalReports: 0,
        completedReports: 0,
        openReports: 0,
        stuckReports: 0,
        unpjumCompletedReports: 0,
        completionRate: 0,
    };
}

async function getAdminBranchOverview(
    branchName: string,
    period: string,
): Promise<AdminBranchRow | null> {
    const periodWindow = getActivityPeriodWindow(period);
    const periodDateFilter = buildDateFilter(periodWindow);
    const stuckThreshold = getBranchStuckThresholdDate();

    const officialBranchRows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS "count"
        FROM "User"
        WHERE "branchNames"[1] = ${branchName}
          AND "deletedAt" IS NULL
    `;

    if ((officialBranchRows[0]?.count ?? 0) === 0) {
        return null;
    }

    const [
        activeStores,
        userRoleRows,
        reportCount,
        completedAggregate,
        openReports,
        stuckReports,
        unpjumCompletedReportRows,
        lastActivityRows,
    ] = await Promise.all([
        prisma.store.count({
            where: { branchName, isActive: true },
        }),
        prisma.$queryRaw<UserRoleCountRow[]>`
            SELECT
                "branchNames"[1] AS "branchName",
                "role"::text AS "role",
                COUNT(*)::int AS "count"
            FROM "User"
            WHERE "branchNames"[1] = ${branchName}
              AND "deletedAt" IS NULL
            GROUP BY "branchNames"[1], "role"
        `,
        prisma.report.count({
            where: {
                branchName,
                status: { not: "DRAFT" },
                createdAt: periodDateFilter,
            },
        }),
        prisma.report.aggregate({
            where: {
                branchName,
                status: "COMPLETED",
                pjumExportedAt: { not: null },
                finishedAt: periodDateFilter,
            },
            _count: { _all: true },
            _sum: { totalReal: true },
        }),
        prisma.report.count({
            where: {
                branchName,
                status: { in: [...BRANCH_OPEN_REPORT_STATUSES] },
            },
        }),
        prisma.report.count({
            where: {
                branchName,
                status: { in: [...BRANCH_OPEN_REPORT_STATUSES] },
                createdAt: { lt: stuckThreshold },
                activities: {
                    none: {
                        createdAt: { gte: stuckThreshold },
                    },
                },
            },
        }),
        prisma.report.findMany({
            where: {
                branchName,
                status: "COMPLETED",
                pjumExportedAt: null,
            },
            select: {
                totalReal: true,
                items: true,
            },
        }),
        prisma.activityLog.findFirst({
            where: { report: { branchName, status: { not: "DRAFT" } } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        }),
    ]);
    const unpjumCompletedReports = unpjumCompletedReportRows.filter((report) =>
        requiresPjum(report.totalReal, report.items),
    ).length;

    const usersForBranch = { BMS: 0, BMC: 0, BNM_MANAGER: 0 };
    for (const row of userRoleRows) {
        if (
            row.role === "BMS" ||
            row.role === "BMC" ||
            row.role === "BNM_MANAGER"
        ) {
            usersForBranch[row.role] += row.count;
        }
    }

    const completedCount = completedAggregate._count._all;
    const totalRealisasi = Number(completedAggregate._sum.totalReal ?? 0);

    return {
        branchName,
        activeStores,
        bmsUsers: usersForBranch.BMS,
        bmcUsers: usersForBranch.BMC,
        bnmUsers: usersForBranch.BNM_MANAGER,
        reportCount,
        completedCount,
        completionRate: calculateBranchCompletionRate(
            completedCount,
            reportCount,
        ),
        openReports,
        stuckReports,
        unpjumCompletedReports,
        totalRealisasi,
        avgRealisasi:
            completedCount > 0
                ? Math.round(totalRealisasi / completedCount)
                : 0,
        lastActivityAt: lastActivityRows?.createdAt ?? null,
    };
}

export async function getAdminBranchesData(
    period = "ytd",
): Promise<AdminBranchesData> {
    const user = await requireBranchMonitor();

    const correlationId = crypto.randomUUID();
    const start = performance.now();
    const periodWindow = getActivityPeriodWindow(period);
    const periodDateFilter = buildDateFilter(periodWindow);
    const stuckThreshold = getBranchStuckThresholdDate();

    try {
        const branchNames = await getVisibleBranchNames(user);
        if (branchNames.length === 0) {
            return { summary: emptySummary(), branches: [] };
        }

        const [
            storeRows,
            userRoleRows,
            reportRows,
            completedRows,
            openRows,
            stuckRows,
            unpjumRows,
            lastActivityRows,
        ] = await Promise.all([
            prisma.store.groupBy({
                by: ["branchName"],
                where: {
                    branchName: { in: branchNames },
                    isActive: true,
                    NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
                },
                _count: { _all: true },
            }),
            prisma.$queryRaw<UserRoleCountRow[]>`
                SELECT
                    "branchNames"[1] AS "branchName",
                    "role"::text AS "role",
                    COUNT(*)::int AS "count"
                FROM "User"
                WHERE ${branchNames}::text[] && "branchNames"
                  AND "deletedAt" IS NULL
                  AND NOT (${EXCLUDED_ADMIN_BRANCH_NAME} = ANY("branchNames"))
                  AND "branchNames"[1] IS NOT NULL
                  AND "branchNames"[1] <> ${EXCLUDED_ADMIN_BRANCH_NAME}
                GROUP BY "branchNames"[1], "role"
            `,
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    branchName: { in: branchNames },
                    status: { not: "DRAFT" },
                    createdAt: periodDateFilter,
                },
                _count: { _all: true },
            }),
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    branchName: { in: branchNames },
                    status: "COMPLETED",
                    pjumExportedAt: { not: null },
                    finishedAt: periodDateFilter,
                },
                _count: { _all: true },
                _sum: { totalReal: true },
            }),
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    branchName: { in: branchNames },
                    status: { in: [...BRANCH_OPEN_REPORT_STATUSES] },
                },
                _count: { _all: true },
            }),
            prisma.report.groupBy({
                by: ["branchName"],
                where: {
                    branchName: { in: branchNames },
                    status: { in: [...BRANCH_OPEN_REPORT_STATUSES] },
                    createdAt: { lt: stuckThreshold },
                    activities: {
                        none: {
                            createdAt: { gte: stuckThreshold },
                        },
                    },
                },
                _count: { _all: true },
            }),
            prisma.report.findMany({
                where: {
                    branchName: { in: branchNames },
                    status: "COMPLETED",
                    pjumExportedAt: null,
                },
                select: {
                    branchName: true,
                    totalReal: true,
                    items: true,
                },
            }),
            prisma.$queryRaw<BranchActivityRow[]>`
                SELECT
                    r."branchName" AS "branchName",
                    MAX(a."createdAt") AS "lastActivityAt"
                FROM "ActivityLog" a
                INNER JOIN "Report" r ON r."reportNumber" = a."reportNumber"
                WHERE r."branchName" = ANY(${branchNames}::text[])
                  AND r."status" <> 'DRAFT'::"ReportStatus"
                GROUP BY r."branchName"
            `,
        ]);

        const storeMap = mapCountRows(storeRows);
        const reportMap = mapCountRows(reportRows);
        const openMap = mapCountRows(openRows);
        const stuckMap = mapCountRows(stuckRows);
        const unpjumMap = mapRequiredUnpjumRows(unpjumRows);
        const completedMap = new Map(
            completedRows.map((row: CompletedRow) => [
                row.branchName,
                {
                    count: row._count._all,
                    totalRealisasi: Number(row._sum.totalReal ?? 0),
                },
            ]),
        );
        const userMap = new Map<
            string,
            { BMS: number; BMC: number; BNM_MANAGER: number }
        >();
        for (const row of userRoleRows) {
            const branchName = row.branchName;
            if (!branchName || !branchNames.includes(branchName)) continue;
            const current =
                userMap.get(branchName) ??
                { BMS: 0, BMC: 0, BNM_MANAGER: 0 };
            if (
                row.role === "BMS" ||
                row.role === "BMC" ||
                row.role === "BNM_MANAGER"
            ) {
                current[row.role] += row.count;
            }
            userMap.set(branchName, current);
        }

        const activityMap = new Map(
            lastActivityRows.map((row) => [
                row.branchName,
                row.lastActivityAt,
            ]),
        );

        const branches = branchNames.map((branchName) => {
            const reportCount = reportMap.get(branchName) ?? 0;
            const completed = completedMap.get(branchName) ?? {
                count: 0,
                totalRealisasi: 0,
            };
            const usersForBranch = userMap.get(branchName) ?? {
                BMS: 0,
                BMC: 0,
                BNM_MANAGER: 0,
            };

            return {
                branchName,
                activeStores: storeMap.get(branchName) ?? 0,
                bmsUsers: usersForBranch.BMS,
                bmcUsers: usersForBranch.BMC,
                bnmUsers: usersForBranch.BNM_MANAGER,
                reportCount,
                completedCount: completed.count,
                completionRate: calculateBranchCompletionRate(
                    completed.count,
                    reportCount,
                ),
                openReports: openMap.get(branchName) ?? 0,
                stuckReports: stuckMap.get(branchName) ?? 0,
                unpjumCompletedReports: unpjumMap.get(branchName) ?? 0,
                totalRealisasi: completed.totalRealisasi,
                avgRealisasi:
                    completed.count > 0
                        ? Math.round(completed.totalRealisasi / completed.count)
                        : 0,
                lastActivityAt: activityMap.get(branchName) ?? null,
            };
        });

        const summary = branches.reduce(
            (acc, branch) => {
                acc.totalReports += branch.reportCount;
                acc.completedReports += branch.completedCount;
                acc.openReports += branch.openReports;
                acc.stuckReports += branch.stuckReports;
                acc.unpjumCompletedReports += branch.unpjumCompletedReports;
                return acc;
            },
            emptySummary(branchNames.length),
        );
        summary.completionRate = calculateBranchCompletionRate(
            summary.completedReports,
            summary.totalReports,
        );

        logger.info(
            {
                operation: "getAdminBranchesData",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                count: branches.length,
            },
            "Fetched admin branches data",
        );

        return {
            summary,
            branches: branches.sort(
                (a, b) =>
                    b.openReports - a.openReports ||
                    b.stuckReports - a.stuckReports ||
                    a.branchName.localeCompare(b.branchName, "id-ID"),
            ),
        };
    } catch (error) {
        logger.error(
            {
                operation: "getAdminBranchesData",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Failed to fetch admin branches data",
            error,
        );
        return { summary: emptySummary(), branches: [] };
    }
}

function mapReportItem(report: {
    reportNumber: string;
    storeName: string;
    status: string;
    updatedAt: Date;
    finishedAt: Date | null;
    totalReal: Prisma.Decimal | null;
    activities?: { createdAt: Date }[];
}): AdminBranchReportItem {
    const lastActivityAt = report.activities?.[0]?.createdAt ?? report.updatedAt;

    return {
        reportNumber: report.reportNumber,
        storeName: report.storeName,
        status: report.status,
        statusLabel: getReportStatusLabel(report.status),
        updatedAt: lastActivityAt,
        finishedAt: report.finishedAt,
        totalReal: report.totalReal === null ? null : Number(report.totalReal),
        ageDays: calculateAgeDays(lastActivityAt),
    };
}

export async function getAdminBranchDetail(
    branchName: string,
    period = "ytd",
): Promise<AdminBranchDetail | null> {
    const user = await requireBranchMonitor();
    const visibleBranchNames = await getVisibleBranchNames(user);
    if (!visibleBranchNames.includes(branchName)) return null;

    const branch = await getAdminBranchOverview(branchName, period);
    if (!branch) return null;

    const periodWindow = getActivityPeriodWindow(period);
    const periodDateFilter = buildDateFilter(periodWindow);
    const stuckThreshold = getBranchStuckThresholdDate();

    const [
        statusRows,
        bmsRows,
        stuckReports,
        unpjumReports,
        activityRows,
    ] = await Promise.all([
        prisma.report.groupBy({
            by: ["status"],
            where: {
                branchName,
                status: { not: "DRAFT" },
                createdAt: periodDateFilter,
            },
            _count: { _all: true },
        }),
        prisma.report.groupBy({
            by: ["createdByNIK"],
            where: {
                branchName,
                status: "COMPLETED",
                pjumExportedAt: { not: null },
                finishedAt: periodDateFilter,
            },
            _count: { _all: true },
            _sum: { totalReal: true },
            orderBy: { _count: { createdByNIK: "desc" } },
            take: 8,
        }),
        prisma.report.findMany({
            where: {
                branchName,
                status: { in: [...BRANCH_OPEN_REPORT_STATUSES] },
                createdAt: { lt: stuckThreshold },
                activities: {
                    none: {
                        createdAt: { gte: stuckThreshold },
                    },
                },
            },
            orderBy: [{ updatedAt: "asc" }],
            take: 8,
            select: {
                reportNumber: true,
                storeName: true,
                status: true,
                updatedAt: true,
                finishedAt: true,
                totalReal: true,
                activities: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        }),
        prisma.report.findMany({
            where: {
                branchName,
                status: "COMPLETED",
                pjumExportedAt: null,
            },
            orderBy: [{ finishedAt: "asc" }, { updatedAt: "asc" }],
            take: 8,
            select: {
                reportNumber: true,
                storeName: true,
                status: true,
                updatedAt: true,
                finishedAt: true,
                totalReal: true,
                items: true,
            },
        }),
        prisma.activityLog.findMany({
            where: { report: { branchName } },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
                id: true,
                reportNumber: true,
                action: true,
                createdAt: true,
                actor: { select: { name: true } },
                report: { select: { storeName: true } },
            },
        }),
    ]);

    const bmsUsers = await prisma.user.findMany({
        where: {
            NIK: { in: bmsRows.map((row) => row.createdByNIK) },
        },
        select: { NIK: true, name: true },
    });
    const bmsNameMap = new Map(bmsUsers.map((user) => [user.NIK, user.name]));

    return {
        branch,
        status: statusRows
            .map((row) => ({
                status: row.status,
                label: getReportStatusLabel(row.status),
                count: row._count._all,
            }))
            .sort((a, b) => b.count - a.count),
        topBms: bmsRows.map((row) => {
            const totalRealisasi = Number(row._sum.totalReal ?? 0);
            return {
                nik: row.createdByNIK,
                name: bmsNameMap.get(row.createdByNIK) ?? row.createdByNIK,
                completedCount: row._count._all,
                totalRealisasi,
                avgRealisasi:
                    row._count._all > 0
                        ? Math.round(totalRealisasi / row._count._all)
                        : 0,
            };
        }),
        stuckReports: stuckReports.map(mapReportItem),
        unpjumReports: unpjumReports
            .filter((report) => requiresPjum(report.totalReal, report.items))
            .map(mapReportItem),
        recentActivity: activityRows.map((row) => ({
            id: row.id,
            reportNumber: row.reportNumber,
            storeName: row.report.storeName,
            action: row.action,
            actorName: row.actor.name,
            createdAt: row.createdAt,
        })),
    };
}
