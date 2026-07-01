"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { revalidatePath } from "next/cache";
import { isReportStatusKey } from "@/lib/report-status";
import { getReportSlaDays } from "@/lib/app-settings";
import { getJakartaDateRange } from "@/lib/time";

export type AdminReportFilters = {
    search?: string;
    status?: string;
    scope?: string;
    branchName?: string;
    fromDate?: string;
    toDate?: string;
    pjumStatus?: string;
};

const ACTIVE_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

const REVISION_REPORT_STATUSES = [
    "ESTIMATION_REJECTED_REVISION",
    "REVIEW_REJECTED_REVISION",
] as const;

const BMC_REVIEW_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "PENDING_REVIEW",
] as const;

function buildOverdueWhere(
    slaDaysByStatus: Partial<Record<string, number>>,
    now = new Date(),
): Prisma.ReportWhereInput {
    const slaEntries = Object.entries(slaDaysByStatus) as [
        string,
        number,
    ][];

    return {
        OR: slaEntries.map(([status, days]) => {
            const threshold = new Date(now);
            threshold.setDate(threshold.getDate() - days);

            return {
                status: status as Prisma.EnumReportStatusFilter["equals"],
                createdAt: { lt: threshold },
                activities: {
                    none: {
                        createdAt: { gte: threshold },
                    },
                },
            };
        }),
    };
}

function calculateAgeDays(date: Date): number {
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function getReportSlaInfo(
    status: string,
    lastActivityAt: Date,
    slaDaysByStatus: Partial<Record<string, number>>,
) {
    const slaDays = slaDaysByStatus[status] ?? null;
    if (!slaDays) {
        return {
            slaDays,
            slaAgeDays: calculateAgeDays(lastActivityAt),
            slaOverdue: false,
            slaLabel: "Tidak ada SLA",
        };
    }

    const slaAgeDays = calculateAgeDays(lastActivityAt);
    const slaOverdue = slaAgeDays > slaDays;

    return {
        slaDays,
        slaAgeDays,
        slaOverdue,
        slaLabel: slaOverdue ? "Lewat SLA" : "Aman",
    };
}

export async function getAdminReports(
    cursor: string | null,
    limit: number = 20,
    filters: AdminReportFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const scopedBranchNames =
            user.role === "ADMIN"
                ? null
                : user.role === "BMC" || user.role === "BNM_MANAGER"
                  ? user.branchNames.filter(
                        (branchName) => branchName.trim() !== "",
                    )
                  : undefined;

        if (scopedBranchNames === undefined) {
            throw new Error("Unauthorized");
        }

        const slaDaysByStatus = await getReportSlaDays();

        const where: Prisma.ReportWhereInput =
            scopedBranchNames === null
                ? { NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } }
                : { branchName: { in: scopedBranchNames } };

        const andFilters: Prisma.ReportWhereInput[] = [];

        // Search: reportNumber, storeName, storeCode, BMS NIK, BMS name
        if (filters.search) {
            andFilters.push({
                OR: [
                    {
                        reportNumber: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        storeName: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        storeCode: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        createdByNIK: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        createdBy: {
                            name: {
                                contains: filters.search,
                                mode: "insensitive",
                            },
                        },
                    },
                ],
            });
        }

        if (filters.scope && filters.scope !== "all") {
            if (filters.scope === "active") {
                andFilters.push({ status: { in: [...ACTIVE_REPORT_STATUSES] } });
            }
            if (filters.scope === "overdue") {
                andFilters.push(buildOverdueWhere(slaDaysByStatus));
            }
            if (filters.scope === "review_bmc") {
                andFilters.push({
                    status: { in: [...BMC_REVIEW_REPORT_STATUSES] },
                });
            }
            if (filters.scope === "review_bnm") {
                andFilters.push({ status: "APPROVED_BMC" });
            }
            if (filters.scope === "revision") {
                andFilters.push({ status: { in: [...REVISION_REPORT_STATUSES] } });
            }
        }

        if (filters.status && filters.status !== "all") {
            if (filters.status === "active") {
                andFilters.push({ status: { in: [...ACTIVE_REPORT_STATUSES] } });
            } else if (isReportStatusKey(filters.status)) {
                where.status =
                    filters.status as Prisma.EnumReportStatusFilter["equals"];
            }
        }

        if (filters.branchName && filters.branchName !== "all") {
            if (
                scopedBranchNames === null ||
                scopedBranchNames.includes(filters.branchName)
            ) {
                where.branchName = filters.branchName;
            } else {
                where.branchName = { in: [] };
            }
        }

        if (filters.fromDate || filters.toDate) {
            const { start, endExclusive } = getJakartaDateRange(
                filters.fromDate,
                filters.toDate,
            );

            where.createdAt = {
                ...(start ? { gte: start } : {}),
                ...(endExclusive ? { lt: endExclusive } : {}),
            };
        }

        if (filters.pjumStatus && filters.pjumStatus !== "all") {
            if (filters.pjumStatus === "exported") {
                where.pjumExportedAt = { not: null };
            }
            if (filters.pjumStatus === "not_exported") {
                where.pjumExportedAt = null;
            }
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }
        
        // Count total reports for the given filters
        const totalCount = await prisma.report.count({ where });
        const overdueCount = await prisma.report.count({
            where: {
                AND: [where, buildOverdueWhere(slaDaysByStatus)],
            },
        });
        const shouldPrioritizeOldestUpdate =
            filters.scope === "overdue" ||
            filters.scope === "active" ||
            filters.status === "active";

        const reports = await prisma.report.findMany({
            where,
            take: limit + 1, // Take one extra to determine if there's a next page
            skip: cursor ? 1 : 0,
            cursor: cursor ? { reportNumber: cursor } : undefined,
            orderBy:
                shouldPrioritizeOldestUpdate
                    ? [{ updatedAt: "asc" }, { reportNumber: "desc" }]
                    : [{ updatedAt: "desc" }, { reportNumber: "desc" }],
            select: {
                reportNumber: true,
                createdAt: true,
                updatedAt: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                totalReal: true,
                finishedAt: true,
                pjumExportedAt: true,
                createdByNIK: true,
                createdBy: {
                    select: {
                        name: true,
                        NIK: true,
                    },
                },
                activities: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        });

        let nextCursor: typeof cursor = null;
        if (reports.length > limit) {
            const nextItem = reports.pop(); // Remove the extra item
            nextCursor = nextItem!.reportNumber;
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminReports", correlationId, durationMs, count: reports.length },
            "Fetched admin reports successfully"
        );

        return {
            reports: reports.map(r => {
                const { activities, ...report } = r;
                const lastActivityAt = activities[0]?.createdAt ?? r.createdAt;

                return {
                    ...report,
                    lastActivityAt,
                    totalEstimation: Number(r.totalEstimation),
                    totalReal: r.totalReal ? Number(r.totalReal) : null,
                    ...getReportSlaInfo(
                        r.status,
                        lastActivityAt,
                        slaDaysByStatus,
                    ),
                };
            }),
            nextCursor,
            totalCount,
            summary: {
                totalCount,
                overdueCount,
            },
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminReports", correlationId, durationMs },
            "Failed to fetch admin reports",
            error
        );
        throw new Error("Failed to load reports");
    }
}

export async function deleteAdminReport(reportNumber: string) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (
            !user ||
            (user.role !== "ADMIN" &&
                user.role !== "BMC" &&
                user.role !== "BNM_MANAGER")
        ) {
            throw new Error("Unauthorized");
        }

        const report = await prisma.report.findUnique({
            where: { reportNumber },
            select: {
                reportNumber: true,
                branchName: true,
                storeName: true,
            },
        });

        if (!report) {
            return { error: "Laporan tidak ditemukan" };
        }

        if (
            user.role !== "ADMIN" &&
            !user.branchNames.includes(report.branchName)
        ) {
            return { error: "Laporan ini bukan dari cabang Anda" };
        }

        if (
            user.role === "ADMIN" &&
            report.branchName === EXCLUDED_ADMIN_BRANCH_NAME
        ) {
            return {
                error: "Laporan HEAD OFFICE tidak dapat dihapus dari dashboard admin",
            };
        }

        await prisma.$transaction(async (tx) => {
            await tx.approvalLog.deleteMany({ where: { reportNumber } });
            await tx.activityLog.deleteMany({ where: { reportNumber } });

            const relatedPjums = await tx.pjumExport.findMany({
                where: { reportNumbers: { has: reportNumber } },
                select: { id: true, reportNumbers: true },
            });

            for (const pjum of relatedPjums) {
                const nextReportNumbers = pjum.reportNumbers.filter(
                    (item) => item !== reportNumber,
                );

                if (nextReportNumbers.length === 0) {
                    await tx.pjumExport.delete({ where: { id: pjum.id } });
                } else {
                    await tx.pjumExport.update({
                        where: { id: pjum.id },
                        data: { reportNumbers: { set: nextReportNumbers } },
                    });
                }
            }

            await tx.report.delete({ where: { reportNumber } });
        });

        revalidatePath("/dashboard/reports");
        revalidatePath("/dashboard/materials");
        revalidatePath("/dashboard/pjum");
        revalidatePath("/dashboard/preventive");
        revalidatePath("/dashboard");
        revalidatePath(`/reports/${reportNumber}`);
        revalidatePath(`/dashboard/reports/${reportNumber}`);

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "deleteAdminReport",
                correlationId,
                durationMs,
                reportNumber,
                userId: user.NIK,
                branchName: report.branchName,
            },
            "Deleted admin report successfully",
        );

        return { success: true };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "deleteAdminReport", correlationId, durationMs, reportNumber },
            "Failed to delete admin report",
            error,
        );
        return { error: "Gagal menghapus laporan" };
    }
}
