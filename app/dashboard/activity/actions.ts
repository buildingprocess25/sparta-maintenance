"use server";

import prisma from "@/lib/prisma";
import { getAuthUser, type AuthUser } from "@/lib/authorization";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getActivityPeriodWindow } from "@/lib/admin-activity-period";
import { logger } from "@/lib/logger";
import { getTodayActiveUsers } from "@/lib/presence";
import type { Prisma, UserRole } from "@prisma/client";

export type AdminActivityModule = "MAINTENANCE" | "PJUM" | "REALISASI";

export type AdminActivityFilters = {
    search?: string;
    branchName?: string;
    role?: string;
    module?: string;
    action?: string;
};

export type AdminActivityEvent = {
    id: string;
    occurredAt: Date;
    module: AdminActivityModule;
    action: string;
    actionLabel: string;
    actor: {
        NIK: string;
        name: string;
        role: UserRole | "UNKNOWN";
    };
    branchName: string;
    targetLabel: string;
    targetHref: string | null;
    notes: string | null;
    reportNumber: string | null;
    storeName: string | null;
};

export type AdminActivitySummary = {
    activityToday: number;
    activityPeriod: number;
    activeUsers: number;
    revisionRejectToday: number;
    revisionRejectPeriod: number;
    approvalDoneToday: number;
    approvalDonePeriod: number;
};

export type AdminActivityResult = {
    events: AdminActivityEvent[];
    totalCount: number;
    nextOffset: number | null;
    summary: AdminActivitySummary;
};

const PAGE_LIMIT = 20;

const REVISION_REJECT_ACTIONS = [
    "ESTIMATION_REJECTED_REVISION",
    "ESTIMATION_REJECTED",
    "WORK_REJECTED_REVISION",
    "FINAL_REJECTED_REVISION_BNM",
    "ADMIN_REALISASI_REVISED",
] as const;

const APPROVAL_DONE_ACTIONS = [
    "ESTIMATION_APPROVED",
    "WORK_APPROVED",
    "FINAL_APPROVED_BNM",
] as const;

const ACTION_LABELS: Record<string, string> = {
    SUBMITTED: "Laporan diajukan",
    RESUBMITTED_ESTIMATION: "Laporan direvisi & diajukan ulang",
    RESUBMITTED_WORK: "Pekerjaan direvisi & diajukan ulang",
    WORK_STARTED: "Pekerjaan dimulai",
    COMPLETION_SUBMITTED: "Pekerjaan selesai diajukan",
    ESTIMATION_APPROVED: "Estimasi disetujui",
    ESTIMATION_REJECTED_REVISION: "Estimasi ditolak revisi",
    ESTIMATION_REJECTED: "Estimasi ditolak",
    WORK_APPROVED: "Pekerjaan disetujui BMC",
    WORK_REJECTED_REVISION: "Pekerjaan ditolak revisi",
    FINAL_APPROVED_BNM: "Disetujui final BNM",
    FINAL_REJECTED_REVISION_BNM: "Ditolak final BNM revisi",
    ADMIN_REALISASI_REVISED: "Realisasi direvisi admin",
    PJUM_CREATED: "PJUM diajukan",
    PJUM_APPROVED: "PJUM disetujui",
};

function getActionLabel(action: string) {
    return ACTION_LABELS[action] ?? action;
}

function getActivityModule(action: string): AdminActivityModule {
    return action === "ADMIN_REALISASI_REVISED" ? "REALISASI" : "MAINTENANCE";
}

function buildDateFilter(period: string | undefined) {
    const window = getActivityPeriodWindow(period);
    return buildWindowDateFilter(window);
}

function buildWindowDateFilter(window: { start: Date; end?: Date }) {
    return {
        gte: window.start,
        ...(window.end ? { lt: window.end } : {}),
    };
}

function getTodayWindow() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

function normalizeFilterValue(value?: string) {
    if (!value || value === "all") return undefined;
    return value;
}

async function requireActivityViewer() {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC")) {
        throw new Error("Unauthorized");
    }
    return user;
}

function getScopedBranchNames(user: AuthUser) {
    return user.branchNames
        .map((branchName) => branchName.trim())
        .filter((branchName) => branchName.length > 0);
}

function getReportScopeFilters(user: AuthUser): Prisma.ReportWhereInput[] {
    if (user.role === "ADMIN") {
        return [{ NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } }];
    }

    const branchNames = getScopedBranchNames(user);
    if (branchNames.length === 0) {
        return [{ branchName: "__NO_BRANCH_SCOPE__" }];
    }

    return [{ branchName: { in: branchNames } }];
}

function getPjumScopeFilter(user: AuthUser): Prisma.PjumExportWhereInput {
    if (user.role === "ADMIN") {
        return { NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } };
    }

    const branchNames = getScopedBranchNames(user);
    if (branchNames.length === 0) {
        return { branchName: "__NO_BRANCH_SCOPE__" };
    }

    return { branchName: { in: branchNames } };
}

function canAccessBranchFilter(user: AuthUser, branchName: string) {
    return user.role === "ADMIN" || user.branchNames.includes(branchName);
}

function buildReportActivityWhere(
    period: string | undefined,
    filters: AdminActivityFilters,
    user: AuthUser,
): Prisma.ActivityLogWhereInput | null {
    const branchName = normalizeFilterValue(filters.branchName);
    const role = normalizeFilterValue(filters.role);
    const moduleFilter = normalizeFilterValue(filters.module);
    const action = normalizeFilterValue(filters.action);
    const search = filters.search?.trim();

    if (moduleFilter === "PJUM") return null;
    if (action?.startsWith("PJUM_")) return null;

    const where: Prisma.ActivityLogWhereInput = {
        createdAt: buildDateFilter(period),
    };
    const reportFilters: Prisma.ReportWhereInput[] = [
        ...getReportScopeFilters(user),
    ];

    if (moduleFilter === "REALISASI") {
        where.action = "ADMIN_REALISASI_REVISED";
    } else if (moduleFilter === "MAINTENANCE") {
        where.NOT = { action: "ADMIN_REALISASI_REVISED" };
    }

    if (action) {
        where.action = action as Prisma.EnumActivityActionFilter["equals"];
    }

    if (branchName) {
        reportFilters.push({
            branchName: canAccessBranchFilter(user, branchName)
                ? branchName
                : "__NO_BRANCH_SCOPE__",
        });
    }

    if (search) {
        reportFilters.push({
            OR: [
                { reportNumber: { contains: search, mode: "insensitive" } },
                { storeName: { contains: search, mode: "insensitive" } },
                { branchName: { contains: search, mode: "insensitive" } },
            ],
        });

        where.OR = [
            { actorNIK: { contains: search, mode: "insensitive" } },
            { actor: { name: { contains: search, mode: "insensitive" } } },
            { reportNumber: { contains: search, mode: "insensitive" } },
            {
                report: {
                    OR: [
                        {
                            storeName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            branchName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    ],
                },
            },
        ];
    }

    where.report = { AND: reportFilters };

    if (role) {
        where.actor = { role: role as UserRole };
    }

    return where;
}

function buildPjumWhere(
    period: string | undefined,
    filters: AdminActivityFilters,
    user: AuthUser,
): Prisma.PjumExportWhereInput | null {
    const branchName = normalizeFilterValue(filters.branchName);
    const role = normalizeFilterValue(filters.role);
    const moduleFilter = normalizeFilterValue(filters.module);
    const action = normalizeFilterValue(filters.action);
    const search = filters.search?.trim();
    const dateFilter = buildDateFilter(period);

    if (moduleFilter && moduleFilter !== "PJUM") return null;
    if (action && action !== "PJUM_CREATED" && action !== "PJUM_APPROVED") {
        return null;
    }

    const where: Prisma.PjumExportWhereInput = getPjumScopeFilter(user);

    if (branchName) {
        where.branchName = canAccessBranchFilter(user, branchName)
            ? branchName
            : "__NO_BRANCH_SCOPE__";
    }

    if (action === "PJUM_CREATED") {
        where.createdAt = dateFilter;
    } else if (action === "PJUM_APPROVED") {
        where.status = "APPROVED";
        where.approvedAt = dateFilter;
    } else {
        where.OR = [
            { createdAt: dateFilter },
            { status: "APPROVED", approvedAt: dateFilter },
        ];
    }

    if (search) {
        const weekNumber = Number(search);
        const searchFilters: Prisma.PjumExportWhereInput[] = [
            { branchName: { contains: search, mode: "insensitive" } },
            { bmsNIK: { contains: search, mode: "insensitive" } },
            { createdByNIK: { contains: search, mode: "insensitive" } },
        ];

        if (!Number.isNaN(weekNumber)) {
            searchFilters.push({ weekNumber });
        }

        where.AND = [{ OR: searchFilters }];
    }

    if (role && role !== "BMC" && role !== "BNM_MANAGER") {
        return null;
    }

    return where;
}

function isDateInWindow(date: Date | null, period: string | undefined) {
    if (!date) return false;
    const window = getActivityPeriodWindow(period);
    if (date < window.start) return false;
    if (window.end && date >= window.end) return false;
    return true;
}

function applyPjumEventFilters(
    event: AdminActivityEvent,
    filters: AdminActivityFilters,
) {
    const action = normalizeFilterValue(filters.action);
    const role = normalizeFilterValue(filters.role);

    if (action && event.action !== action) return false;
    if (role && event.actor.role !== role) return false;

    return true;
}

async function getPjumUserMap(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, { name: string; role: UserRole }>();

    const users = await prisma.user.findMany({
        where: { NIK: { in: Array.from(new Set(userIds)) } },
        select: { NIK: true, name: true, role: true },
    });

    return new Map(
        users.map((user) => [
            user.NIK,
            { name: user.name, role: user.role as UserRole },
        ]),
    );
}

async function fetchPjumEvents(
    where: Prisma.PjumExportWhereInput | null,
    period: string | undefined,
    filters: AdminActivityFilters,
    take: number,
): Promise<AdminActivityEvent[]> {
    if (!where) return [];

    const rows = await prisma.pjumExport.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take,
        select: {
            id: true,
            status: true,
            branchName: true,
            bmsNIK: true,
            weekNumber: true,
            reportNumbers: true,
            createdByNIK: true,
            approvedByNIK: true,
            approvedAt: true,
            createdAt: true,
            rejectionNotes: true,
        },
    });

    const userMap = await getPjumUserMap(
        rows.flatMap((row) =>
            [row.createdByNIK, row.approvedByNIK].filter(
                (value): value is string => Boolean(value),
            ),
        ),
    );

    const events: AdminActivityEvent[] = [];

    for (const row of rows) {
        const creator = userMap.get(row.createdByNIK);
        if (isDateInWindow(row.createdAt, period)) {
            events.push({
                id: `${row.id}:created`,
                occurredAt: row.createdAt,
                module: "PJUM",
                action: "PJUM_CREATED",
                actionLabel: getActionLabel("PJUM_CREATED"),
                actor: {
                    NIK: row.createdByNIK,
                    name: creator?.name ?? row.createdByNIK,
                    role: creator?.role ?? "UNKNOWN",
                },
                branchName: row.branchName,
                targetLabel: `PJUM Minggu ${row.weekNumber}`,
                targetHref: "/dashboard/pjum",
                notes: `${row.reportNumbers.length} laporan`,
                reportNumber: null,
                storeName: null,
            });
        }

        if (row.status === "APPROVED" && row.approvedAt && row.approvedByNIK) {
            const approver = userMap.get(row.approvedByNIK);
            if (isDateInWindow(row.approvedAt, period)) {
                events.push({
                    id: `${row.id}:approved`,
                    occurredAt: row.approvedAt,
                    module: "PJUM",
                    action: "PJUM_APPROVED",
                    actionLabel: getActionLabel("PJUM_APPROVED"),
                    actor: {
                        NIK: row.approvedByNIK,
                        name: approver?.name ?? row.approvedByNIK,
                        role: approver?.role ?? "UNKNOWN",
                    },
                    branchName: row.branchName,
                    targetLabel: `PJUM Minggu ${row.weekNumber}`,
                    targetHref: "/dashboard/pjum",
                    notes: `${row.reportNumbers.length} laporan`,
                    reportNumber: null,
                    storeName: null,
                });
            }
        }
    }

    return events.filter((event) => applyPjumEventFilters(event, filters));
}

function mapReportActivity(row: {
    id: string;
    reportNumber: string;
    action: string;
    notes: string | null;
    createdAt: Date;
    actor: { NIK: string; name: string; role: UserRole };
    report: { branchName: string; storeName: string; status: string };
}): AdminActivityEvent {
    const activityModule = getActivityModule(row.action);

    return {
        id: row.id,
        occurredAt: row.createdAt,
        module: activityModule,
        action: row.action,
        actionLabel: getActionLabel(row.action),
        actor: row.actor,
        branchName: row.report.branchName,
        targetLabel: row.reportNumber,
        targetHref: `/dashboard/reports/${row.reportNumber}`,
        notes: row.notes,
        reportNumber: row.reportNumber,
        storeName: row.report.storeName,
    };
}

async function countPjumEvents(
    where: Prisma.PjumExportWhereInput | null,
    period: string | undefined,
    filters: AdminActivityFilters,
) {
    if (!where) return 0;
    const events = await fetchPjumEvents(where, period, filters, 1000);
    return events.length;
}

async function countPjumEventsInWindow(
    window: { start: Date; end?: Date },
    user: AuthUser,
) {
    const dateFilter = buildWindowDateFilter(window);
    const baseWhere = getPjumScopeFilter(user);

    const [created, approved] = await Promise.all([
        prisma.pjumExport.count({
            where: {
                ...baseWhere,
                createdAt: dateFilter,
            },
        }),
        prisma.pjumExport.count({
            where: {
                ...baseWhere,
                status: "APPROVED",
                approvedAt: dateFilter,
            },
        }),
    ]);

    return created + approved;
}

async function countReportActivityInWindow(
    window: { start: Date; end?: Date },
    user: AuthUser,
    actionFilter?: Prisma.EnumActivityActionFilter,
) {
    return prisma.activityLog.count({
        where: {
            createdAt: buildWindowDateFilter(window),
            ...(actionFilter ? { action: actionFilter } : {}),
            report: { AND: getReportScopeFilters(user) },
        },
    });
}

async function countVisibleTodayActiveUsers(user: AuthUser) {
    const activeUserIds = await getTodayActiveUsers();
    if (activeUserIds.length === 0) return 0;

    return prisma.user.count({
        where: {
            NIK: { in: activeUserIds },
            ...(user.role === "ADMIN"
                ? {
                      NOT: {
                          branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME },
                      },
                  }
                : {
                      branchNames: {
                          hasSome: getScopedBranchNames(user),
                      },
                  }),
        },
    });
}

async function getActivitySummary(
    period: string | undefined,
    user: AuthUser,
): Promise<AdminActivitySummary> {
    const periodWindow = getActivityPeriodWindow(period);
    const todayWindow = getTodayWindow();
    const revisionRejectFilter: Prisma.EnumActivityActionFilter = {
        in: [...REVISION_REJECT_ACTIONS],
    };
    const approvalDoneFilter: Prisma.EnumActivityActionFilter = {
        in: [...APPROVAL_DONE_ACTIONS],
    };

    const [
        reportActivityToday,
        reportActivityPeriod,
        pjumActivityToday,
        pjumActivityPeriod,
        activeUsers,
        reportRevisionRejectToday,
        reportRevisionRejectPeriod,
        reportApprovalDoneToday,
        reportApprovalDonePeriod,
        pjumApprovalDoneToday,
        pjumApprovalDonePeriod,
    ] = await Promise.all([
        countReportActivityInWindow(todayWindow, user),
        countReportActivityInWindow(periodWindow, user),
        countPjumEventsInWindow(todayWindow, user),
        countPjumEventsInWindow(periodWindow, user),
        countVisibleTodayActiveUsers(user),
        countReportActivityInWindow(todayWindow, user, revisionRejectFilter),
        countReportActivityInWindow(periodWindow, user, revisionRejectFilter),
        countReportActivityInWindow(todayWindow, user, approvalDoneFilter),
        countReportActivityInWindow(periodWindow, user, approvalDoneFilter),
        prisma.pjumExport.count({
            where: {
                ...getPjumScopeFilter(user),
                status: "APPROVED",
                approvedAt: buildWindowDateFilter(todayWindow),
            },
        }),
        prisma.pjumExport.count({
            where: {
                ...getPjumScopeFilter(user),
                status: "APPROVED",
                approvedAt: buildWindowDateFilter(periodWindow),
            },
        }),
    ]);

    return {
        activityToday: reportActivityToday + pjumActivityToday,
        activityPeriod: reportActivityPeriod + pjumActivityPeriod,
        activeUsers,
        revisionRejectToday: reportRevisionRejectToday,
        revisionRejectPeriod: reportRevisionRejectPeriod,
        approvalDoneToday: reportApprovalDoneToday + pjumApprovalDoneToday,
        approvalDonePeriod: reportApprovalDonePeriod + pjumApprovalDonePeriod,
    };
}

export async function getAdminActivityEvents(
    offset = 0,
    limit = PAGE_LIMIT,
    period?: string,
    filters: AdminActivityFilters = {},
): Promise<AdminActivityResult> {
    const viewer = await requireActivityViewer();

    const correlationId = crypto.randomUUID();
    const start = performance.now();
    const reportWhere = buildReportActivityWhere(period, filters, viewer);
    const pjumWhere = buildPjumWhere(period, filters, viewer);
    const take = offset + limit;

    try {
        const [reportRows, reportCount, pjumEvents, pjumCount] =
            await Promise.all([
                reportWhere
                    ? prisma.activityLog.findMany({
                          where: reportWhere,
                          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                          take,
                          select: {
                              id: true,
                              reportNumber: true,
                              action: true,
                              notes: true,
                              createdAt: true,
                              actor: {
                                  select: {
                                      NIK: true,
                                      name: true,
                                      role: true,
                                  },
                              },
                              report: {
                                  select: {
                                      branchName: true,
                                      storeName: true,
                                      status: true,
                                  },
                              },
                          },
                      })
                    : Promise.resolve([]),
                reportWhere
                    ? prisma.activityLog.count({ where: reportWhere })
                    : Promise.resolve(0),
                fetchPjumEvents(pjumWhere, period, filters, take),
                countPjumEvents(pjumWhere, period, filters),
            ]);

        const events = [
            ...reportRows.map((row) =>
                mapReportActivity({
                    ...row,
                    action: row.action as string,
                }),
            ),
            ...pjumEvents,
        ].sort(
            (a, b) =>
                b.occurredAt.getTime() - a.occurredAt.getTime() ||
                b.id.localeCompare(a.id),
        );

        const totalCount = reportCount + pjumCount;
        const page = events.slice(offset, offset + limit);
        const summary = await getActivitySummary(period, viewer);

        logger.info(
            {
                operation: "getAdminActivityEvents",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                count: page.length,
            },
            "Fetched admin activity events",
        );

        return {
            events: page,
            totalCount,
            nextOffset: offset + limit < totalCount ? offset + limit : null,
            summary,
        };
    } catch (error) {
        logger.error(
            {
                operation: "getAdminActivityEvents",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Failed to fetch admin activity events",
            error,
        );
        throw new Error("Gagal memuat aktivitas user");
    }
}

