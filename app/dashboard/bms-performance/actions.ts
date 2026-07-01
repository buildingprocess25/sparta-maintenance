import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPjumPolicySettings, getReportSlaDays } from "@/lib/app-settings";
import { getAuthUser, type AuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type { ReportStatusKey } from "@/lib/report-status";
import { formatJakartaDate } from "@/lib/time";

const ACTIVE_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const satisfies readonly ReportStatusKey[];

const PERFORMANCE_REPORT_STATUSES = [
    ...ACTIVE_REPORT_STATUSES,
    "COMPLETED",
] as const satisfies readonly ReportStatusKey[];

const PERIOD_OPTIONS = ["quarter", "ytd"] as const;

export type BmsPerformancePeriod = (typeof PERIOD_OPTIONS)[number];

export type BmsPerformanceFilters = {
    period?: string;
};

export type BmsPerformanceRow = {
    nik: string;
    name: string;
    branchNames: string[];
    activeReports: number;
    completedReports: number;
    overdueReports: number;
    revisionReports: number;
    totalRealisasi: number;
    avgRealisasi: number;
    avgWeeklyRealisasi: number;
    avgCompletionHours: number | null;
    pjumReports: number;
    oldestActiveAgeDays: number | null;
    lastActivityAt: Date | null;
    lastSeenAt: Date | null;
    isActiveToday: boolean;
};

export type BmsPerformanceTrendDatum = {
    weekKey: string;
    label: string;
    totalRealisasi: number;
    avgBmsWeeklyRealisasi: number;
    weeklyAdvanceAmount: number;
};

export type BmsAttentionItem = {
    nik: string;
    name: string;
    value: string;
    helper: string;
    href: string;
    tone: "red" | "amber" | "blue" | "slate";
};

export type BmsPerformanceData = {
    branchNames: string[];
    filters: Required<Pick<BmsPerformanceFilters, "period">>;
    periodLabel: string;
    kpi: {
        totalBms: number;
        activeReports: number;
        completedReports: number;
        overdueReports: number;
        avgWeeklyRealisasi: number;
        avgCompletionHours: number | null;
        weeklyAdvanceAmount: number;
        weekCount: number;
    };
    attention: {
        oldestActive: BmsAttentionItem[];
        overdue: BmsAttentionItem[];
        highAdvance: BmsAttentionItem[];
        revision: BmsAttentionItem[];
        inactiveToday: BmsAttentionItem[];
    };
    trend: BmsPerformanceTrendDatum[];
    rows: BmsPerformanceRow[];
};

function normalizeBranchNames(branchNames: string[]) {
    return Array.from(
        new Set(
            branchNames
                .map((branchName) => branchName.trim())
                .filter((branchName) => branchName.length > 0),
        ),
    ).sort((a, b) => a.localeCompare(b, "id-ID"));
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function getWeekStart(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return d;
}

function getPeriodWindow(filters: BmsPerformanceFilters) {
    const now = new Date();
    const period = PERIOD_OPTIONS.includes(
        filters.period as BmsPerformancePeriod,
    )
        ? (filters.period as BmsPerformancePeriod)
        : "quarter";

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (period === "quarter") {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        start.setMonth(quarterStartMonth, 1);
        return { period, start, end: now };
    }

    if (period === "ytd") {
        start.setMonth(0, 1);
        return { period, start, end: now };
    }

    start.setMonth(0, 1);
    return { period: "ytd" as const, start, end: now };
}

function getDateFilter(window: { start: Date; end: Date }) {
    return {
        gte: window.start,
        lte: window.end,
    };
}

function getWeekKey(date: Date): string {
    return getWeekStart(date).toISOString().slice(0, 10);
}

function getWeekLabel(weekKey: string): string {
    const date = new Date(weekKey);
    return formatJakartaDate(date);
}

function getWeekKeysInWindow(window: { start: Date; end: Date }) {
    const keys: string[] = [];
    const cursor = getWeekStart(window.start);
    const end = getWeekStart(window.end);

    while (cursor <= end) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 7);
    }

    return keys.length > 0 ? keys : [getWeekKey(window.start)];
}

function formatPeriodLabel(window: {
    period: BmsPerformancePeriod;
    start: Date;
    end: Date;
}) {
    const range = `${formatJakartaDate(window.start)} - ${formatJakartaDate(window.end)}`;

    const labelByPeriod: Record<BmsPerformancePeriod, string> = {
        quarter: "Triwulan ini",
        ytd: "Tahun berjalan",
    };

    return `${labelByPeriod[window.period]} (${range})`;
}

function isActiveStatus(status: string): status is (typeof ACTIVE_REPORT_STATUSES)[number] {
    return ACTIVE_REPORT_STATUSES.includes(
        status as (typeof ACTIVE_REPORT_STATUSES)[number],
    );
}

function emptyData(
    branchNames: string[] = [],
    filters: BmsPerformanceFilters = {},
): BmsPerformanceData {
    const window = getPeriodWindow(filters);
    const weekKeys = getWeekKeysInWindow(window);

    return {
        branchNames,
        filters: {
            period: window.period,
        },
        periodLabel: formatPeriodLabel(window),
        kpi: {
            totalBms: 0,
            activeReports: 0,
            completedReports: 0,
            overdueReports: 0,
            avgWeeklyRealisasi: 0,
            avgCompletionHours: null,
            weeklyAdvanceAmount: 0,
            weekCount: weekKeys.length,
        },
        attention: {
            oldestActive: [],
            overdue: [],
            highAdvance: [],
            revision: [],
            inactiveToday: [],
        },
        trend: [],
        rows: [],
    };
}

async function requireBmsPerformanceViewer(): Promise<AuthUser> {
    const user = await getAuthUser();
    if (!user || !["BMC", "BNM_MANAGER"].includes(user.role)) {
        throw new Error("Unauthorized");
    }

    return user;
}

function buildReportWhere({
    branchNames,
    bmsNiks,
    window,
}: {
    branchNames: string[];
    bmsNiks: string[];
    window: { start: Date; end: Date };
}): Prisma.ReportWhereInput {
    return {
        branchName: { in: branchNames },
        createdByNIK: { in: bmsNiks },
        status: { in: [...PERFORMANCE_REPORT_STATUSES] },
        OR: [
            {
                status: { in: [...ACTIVE_REPORT_STATUSES] },
                createdAt: getDateFilter(window),
            },
            {
                status: "COMPLETED",
                finishedAt: getDateFilter(window),
            },
        ],
    };
}

function toAttentionItem(
    row: BmsPerformanceRow,
    value: string,
    helper: string,
    tone: BmsAttentionItem["tone"],
): BmsAttentionItem {
    return {
        nik: row.nik,
        name: row.name,
        value,
        helper,
        href: `/dashboard/bms-performance/${row.nik}`,
        tone,
    };
}

function buildAttention(
    rows: BmsPerformanceRow[],
    weeklyAdvanceAmount: number,
) {
    return {
        oldestActive: rows
            .filter((row) => row.oldestActiveAgeDays !== null)
            .sort(
                (a, b) =>
                    (b.oldestActiveAgeDays ?? 0) -
                    (a.oldestActiveAgeDays ?? 0),
            )
            .slice(0, 3)
            .map((row) =>
                toAttentionItem(
                    row,
                    `${row.oldestActiveAgeDays} hari`,
                    "Laporan aktif paling lama belum bergerak.",
                    "amber",
                ),
            ),
        overdue: rows
            .filter((row) => row.overdueReports > 0)
            .sort((a, b) => b.overdueReports - a.overdueReports)
            .slice(0, 3)
            .map((row) =>
                toAttentionItem(
                    row,
                    `${row.overdueReports} laporan`,
                    "Melewati batas SLA status laporan.",
                    "red",
                ),
            ),
        highAdvance: rows
            .filter(
                (row) =>
                    weeklyAdvanceAmount > 0 &&
                    row.avgWeeklyRealisasi >= weeklyAdvanceAmount * 0.75,
            )
            .sort((a, b) => b.avgWeeklyRealisasi - a.avgWeeklyRealisasi)
            .slice(0, 3)
            .map((row) =>
                toAttentionItem(
                    row,
                    `${Math.round(
                        (row.avgWeeklyRealisasi / weeklyAdvanceAmount) * 100,
                    )}%`,
                    "Rata-rata realisasi mendekati/melebihi uang muka mingguan.",
                    row.avgWeeklyRealisasi > weeklyAdvanceAmount
                        ? "red"
                        : "amber",
                ),
            ),
        revision: rows
            .filter((row) => row.revisionReports > 0)
            .sort((a, b) => b.revisionReports - a.revisionReports)
            .slice(0, 3)
            .map((row) =>
                toAttentionItem(
                    row,
                    `${row.revisionReports} revisi`,
                    "Laporan masih bolak-balik revisi.",
                    "blue",
                ),
            ),
        inactiveToday: rows
            .filter((row) => !row.isActiveToday)
            .sort((a, b) => {
                const aTime = a.lastSeenAt?.getTime() ?? 0;
                const bTime = b.lastSeenAt?.getTime() ?? 0;
                return aTime - bTime;
            })
            .slice(0, 3)
            .map((row) =>
                toAttentionItem(
                    row,
                    row.lastSeenAt ? "Belum aktif hari ini" : "Belum ada data",
                    "Presence terakhir tidak tercatat hari ini.",
                    "slate",
                ),
            ),
    };
}

export async function getBmsPerformanceData(
    filters: BmsPerformanceFilters = {},
): Promise<BmsPerformanceData> {
    const user = await requireBmsPerformanceViewer();
    const branchNames = normalizeBranchNames(user.branchNames);
    const window = getPeriodWindow(filters);
    const weekKeys = getWeekKeysInWindow(window);
    const weekCount = weekKeys.length;
    const todayStart = startOfToday();

    if (branchNames.length === 0) return emptyData(branchNames, filters);

    try {
        const [pjumPolicy, slaDaysByStatus, bmsUsers] = await Promise.all([
            getPjumPolicySettings(),
            getReportSlaDays(),
            prisma.user.findMany({
                where: {
                    role: "BMS",
                    branchNames: { hasSome: branchNames },
                    deletedAt: null,
                },
                orderBy: [{ name: "asc" }, { NIK: "asc" }],
                select: {
                    NIK: true,
                    name: true,
                    branchNames: true,
                },
            }),
        ]);

        if (bmsUsers.length === 0) {
            return emptyData(branchNames, filters);
        }

        const bmsNiks = bmsUsers.map((bms) => bms.NIK);
        const reportWhere = buildReportWhere({
            branchNames,
            bmsNiks,
            window,
        });

        const [reports, presenceRows] = await Promise.all([
            prisma.report.findMany({
                where: reportWhere,
                select: {
                    createdByNIK: true,
                    status: true,
                    createdAt: true,
                    finishedAt: true,
                    pjumExportedAt: true,
                    totalReal: true,
                    activities: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { createdAt: true },
                    },
                },
            }),
            prisma.userPresence.findMany({
                where: { userId: { in: bmsNiks } },
                select: { userId: true, lastSeen: true },
            }),
        ]);

        const rowMap = new Map<string, BmsPerformanceRow>();
        const weeklyTotals = new Map<string, number>(
            weekKeys.map((weekKey) => [weekKey, 0]),
        );
        const durationHours: number[] = [];
        const presenceMap = new Map(
            presenceRows.map((row) => [row.userId, row.lastSeen]),
        );

        for (const bms of bmsUsers) {
            const lastSeenAt = presenceMap.get(bms.NIK) ?? null;
            rowMap.set(bms.NIK, {
                nik: bms.NIK,
                name: bms.name,
                branchNames: bms.branchNames,
                activeReports: 0,
                completedReports: 0,
                overdueReports: 0,
                revisionReports: 0,
                totalRealisasi: 0,
                avgRealisasi: 0,
                avgWeeklyRealisasi: 0,
                avgCompletionHours: null,
                pjumReports: 0,
                oldestActiveAgeDays: null,
                lastActivityAt: null,
                lastSeenAt,
                isActiveToday: lastSeenAt ? lastSeenAt >= todayStart : false,
            });
        }

        const rowDurations = new Map<string, number[]>();

        for (const report of reports) {
            const row = rowMap.get(report.createdByNIK);
            if (!row) continue;

            const lastActivityAt =
                report.activities[0]?.createdAt ?? report.createdAt;
            if (
                !row.lastActivityAt ||
                lastActivityAt > row.lastActivityAt
            ) {
                row.lastActivityAt = lastActivityAt;
            }

            if (isActiveStatus(report.status)) {
                row.activeReports += 1;

                if (
                    report.status === "ESTIMATION_REJECTED_REVISION" ||
                    report.status === "REVIEW_REJECTED_REVISION"
                ) {
                    row.revisionReports += 1;
                }

                const ageDays = Math.max(
                    0,
                    Math.floor(
                        (Date.now() - lastActivityAt.getTime()) / 86_400_000,
                    ),
                );
                row.oldestActiveAgeDays = Math.max(
                    row.oldestActiveAgeDays ?? 0,
                    ageDays,
                );

                const slaDays = slaDaysByStatus[report.status] ?? null;
                if (slaDays !== null && ageDays > slaDays) {
                    row.overdueReports += 1;
                }
                continue;
            }

            if (report.status === "COMPLETED") {
                const realisasi = Number(report.totalReal ?? 0);
                row.completedReports += 1;
                row.totalRealisasi += realisasi;
                if (report.pjumExportedAt) {
                    row.pjumReports += 1;
                }

                if (report.finishedAt) {
                    const weekKey = getWeekKey(report.finishedAt);
                    weeklyTotals.set(
                        weekKey,
                        (weeklyTotals.get(weekKey) ?? 0) + realisasi,
                    );

                    const hours =
                        (report.finishedAt.getTime() -
                            report.createdAt.getTime()) /
                        3_600_000;
                    if (hours >= 0) {
                        durationHours.push(hours);
                        const ownDurations =
                            rowDurations.get(report.createdByNIK) ?? [];
                        ownDurations.push(hours);
                        rowDurations.set(report.createdByNIK, ownDurations);
                    }
                }
            }
        }

        const rows = Array.from(rowMap.values())
            .map((row) => {
                const ownDurations = rowDurations.get(row.nik) ?? [];
                return {
                    ...row,
                    avgRealisasi:
                        row.completedReports > 0
                            ? Math.round(
                                  row.totalRealisasi / row.completedReports,
                              )
                            : 0,
                    avgWeeklyRealisasi:
                        weekCount > 0
                            ? Math.round(row.totalRealisasi / weekCount)
                            : 0,
                    avgCompletionHours:
                        ownDurations.length > 0
                            ? Math.round(
                                  ownDurations.reduce(
                                      (sum, value) => sum + value,
                                      0,
                                  ) / ownDurations.length,
                              )
                            : null,
                };
            })
            .sort(
                (a, b) =>
                    b.activeReports - a.activeReports ||
                    b.overdueReports - a.overdueReports ||
                    b.avgWeeklyRealisasi - a.avgWeeklyRealisasi ||
                    a.name.localeCompare(b.name, "id-ID"),
            );

        const totalRealisasi = rows.reduce(
            (sum, row) => sum + row.totalRealisasi,
            0,
        );
        const trend = weekKeys.map((weekKey) => {
            const total = weeklyTotals.get(weekKey) ?? 0;
            return {
                weekKey,
                label: getWeekLabel(weekKey),
                totalRealisasi: total,
                avgBmsWeeklyRealisasi:
                    rows.length > 0 ? Math.round(total / rows.length) : 0,
                weeklyAdvanceAmount: pjumPolicy.weeklyAdvanceAmount,
            };
        });

        return {
            branchNames,
            filters: {
                period: window.period,
            },
            periodLabel: formatPeriodLabel(window),
            kpi: {
                totalBms: rows.length,
                activeReports: rows.reduce(
                    (sum, row) => sum + row.activeReports,
                    0,
                ),
                completedReports: rows.reduce(
                    (sum, row) => sum + row.completedReports,
                    0,
                ),
                overdueReports: rows.reduce(
                    (sum, row) => sum + row.overdueReports,
                    0,
                ),
                avgWeeklyRealisasi:
                    rows.length > 0 && weekCount > 0
                        ? Math.round(totalRealisasi / rows.length / weekCount)
                        : 0,
                avgCompletionHours:
                    durationHours.length > 0
                        ? Math.round(
                              durationHours.reduce(
                                  (sum, value) => sum + value,
                                  0,
                              ) / durationHours.length,
                          )
                        : null,
                weeklyAdvanceAmount: pjumPolicy.weeklyAdvanceAmount,
                weekCount,
            },
            attention: buildAttention(rows, pjumPolicy.weeklyAdvanceAmount),
            trend,
            rows,
        };
    } catch (error) {
        logger.error(
            { operation: "getBmsPerformanceData", userId: user.NIK },
            "Failed to fetch BMS performance data",
            error,
        );
        return emptyData(branchNames, filters);
    }
}

export async function getScopedBmsProfile(nik: string) {
    const user = await requireBmsPerformanceViewer();
    const branchNames = normalizeBranchNames(user.branchNames);
    if (branchNames.length === 0) return null;

    return prisma.user.findFirst({
        where: {
            NIK: nik,
            role: "BMS",
            branchNames: { hasSome: branchNames },
            deletedAt: null,
        },
        select: {
            NIK: true,
            name: true,
            email: true,
            branchNames: true,
        },
    });
}
