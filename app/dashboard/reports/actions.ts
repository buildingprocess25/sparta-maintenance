"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser, validateCSRF } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
    ARCHIVED_PREVENTIVE_STATUS,
    isReportStatusKey,
} from "@/lib/report-status";
import { getReportSlaDays } from "@/lib/app-settings";
import { getJakartaDateRange } from "@/lib/time";
import { requiresPjum } from "@/lib/realisasi";
import { hasCompletePreventiveEvidence } from "@/lib/report-preventive";
import {
    assertRetentionMutationApplied,
    isDeleteConfirmationValid,
    ReportRetentionConflictError,
    resolvePjumDetachments,
} from "@/lib/report-retention";

export type AdminReportFilters = {
    search?: string;
    status?: string;
    scope?: string;
    branchName?: string;
    areaName?: string;
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

async function getRequiredUnpjumReportNumbers(where: Prisma.ReportWhereInput) {
    const rows = await prisma.report.findMany({
        where: {
            AND: [
                where,
                {
                    status: "COMPLETED",
                    pjumExportedAt: null,
                },
            ],
        },
        select: {
            reportNumber: true,
            totalReal: true,
            items: true,
        },
    });

    return rows
        .filter((report) => requiresPjum(report.totalReal, report.items))
        .map((report) => report.reportNumber);
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

        const andFilters: Prisma.ReportWhereInput[] = [
            { status: { not: ARCHIVED_PREVENTIVE_STATUS } },
        ];

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

        if (filters.areaName && filters.areaName !== "all") {
            if (
                scopedBranchNames === null ||
                user.areaNames.length === 0 ||
                user.areaNames.includes(filters.areaName)
            ) {
                where.areaName = filters.areaName;
            } else {
                where.areaName = "__NO_AREA_SCOPE__";
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

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        if (filters.pjumStatus && filters.pjumStatus !== "all") {
            if (filters.pjumStatus === "exported") {
                where.pjumExportedAt = { not: null };
            }
            if (filters.pjumStatus === "not_exported") {
                const reportNumbers = await getRequiredUnpjumReportNumbers(where);
                where.reportNumber = { in: reportNumbers };
            }
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
                areaName: true,
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

        const pjumCandidates = reports.filter(
            (report) =>
                report.status === "COMPLETED" && !report.pjumExportedAt,
        );
        const requiresPjumByReportNumber = new Map<string, boolean>();

        if (pjumCandidates.length > 0) {
            const rows = await prisma.report.findMany({
                where: {
                    reportNumber: {
                        in: pjumCandidates.map((report) => report.reportNumber),
                    },
                },
                select: {
                    reportNumber: true,
                    totalReal: true,
                    items: true,
                },
            });

            for (const row of rows) {
                requiresPjumByReportNumber.set(
                    row.reportNumber,
                    requiresPjum(row.totalReal, row.items),
                );
            }
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
                    requiresPjum:
                        requiresPjumByReportNumber.get(r.reportNumber) ?? false,
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

export async function archiveAdminReport(
    reportNumber: string,
): Promise<{ success?: true; error?: string }> {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        await validateCSRF(await headers());

        if (!user || user.role !== "ADMIN") {
            return { error: "Hanya Admin yang dapat mengarsipkan laporan" };
        }

        const result = await prisma.$transaction(async (tx) => {
            const report = await tx.report.findUnique({
                where: { reportNumber },
                select: {
                    reportNumber: true,
                    status: true,
                    items: true,
                    pjumExportedAt: true,
                    branchName: true,
                    storeCode: true,
                    storeName: true,
                },
            });

            if (!report) {
                return { error: "Laporan tidak ditemukan" };
            }
            if (report.branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
                return {
                    error: "Laporan HEAD OFFICE tidak dapat diarsipkan dari dashboard admin",
                };
            }
            if (report.status === "DRAFT") {
                return { error: "Laporan draft tidak dapat diarsipkan" };
            }
            if (report.status === "ARCHIVED_PREVENTIVE") {
                return { error: "Laporan sudah diarsipkan" };
            }
            if (!hasCompletePreventiveEvidence(report.items)) {
                return { error: "Bukti Preventive laporan belum lengkap" };
            }

            const relatedPjums = await tx.pjumExport.findMany({
                where: { reportNumbers: { has: reportNumber } },
                select: {
                    id: true,
                    status: true,
                    reportNumbers: true,
                },
            });
            const detachments = resolvePjumDetachments(
                reportNumber,
                relatedPjums,
            );

            if (!detachments.ok) {
                return { error: detachments.error };
            }
            const pjumSnapshots = new Map(
                detachments.snapshots.map(({ id, reportNumbers }) => [
                    id,
                    reportNumbers,
                ]),
            );

            for (const id of detachments.deleteIds) {
                const reportNumbers = pjumSnapshots.get(id);
                if (!reportNumbers) throw new ReportRetentionConflictError();

                const deletion = await tx.pjumExport.deleteMany({
                    where: {
                        id,
                        status: { not: "APPROVED" },
                        reportNumbers: {
                            equals: reportNumbers,
                            has: reportNumber,
                        },
                    },
                });
                assertRetentionMutationApplied(deletion.count);
            }
            for (const update of detachments.updates) {
                const reportNumbers = pjumSnapshots.get(update.id);
                if (!reportNumbers) throw new ReportRetentionConflictError();

                const detachment = await tx.pjumExport.updateMany({
                    where: {
                        id: update.id,
                        status: { not: "APPROVED" },
                        reportNumbers: {
                            equals: reportNumbers,
                            has: reportNumber,
                        },
                    },
                    data: { reportNumbers: { set: update.reportNumbers } },
                });
                assertRetentionMutationApplied(detachment.count);
            }

            const archive = await tx.report.updateMany({
                where: {
                    reportNumber,
                    status: report.status,
                    pjumExportedAt: report.pjumExportedAt,
                },
                data: {
                    status: "ARCHIVED_PREVENTIVE",
                    pjumExportedAt: null,
                },
            });
            assertRetentionMutationApplied(archive.count);

            await tx.activityLog.create({
                data: {
                    reportNumber,
                    actorNIK: user.NIK,
                    action: "ADMIN_ARCHIVED_PREVENTIVE",
                    notes: `Status sebelumnya: ${report.status}`,
                },
            });

            return { success: true as const, report };
        });

        if ("error" in result) {
            return result;
        }

        [
            "/dashboard/reports",
            "/dashboard/materials",
            "/dashboard/pjum",
            "/dashboard/preventive",
            "/dashboard",
            `/reports/${reportNumber}`,
            `/dashboard/reports/${reportNumber}`,
        ].forEach((path) => revalidatePath(path));

        logger.info(
            {
                operation: "archiveAdminReport",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                reportNumber,
                userId: user.NIK,
                branchName: result.report.branchName,
                storeCode: result.report.storeCode,
                storeName: result.report.storeName,
            },
            "Archived admin report successfully",
        );

        return { success: true };
    } catch (error) {
        if (error instanceof ReportRetentionConflictError) {
            return { error: error.message };
        }

        logger.error(
            {
                operation: "archiveAdminReport",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                reportNumber,
            },
            "Failed to archive admin report",
            error,
        );
        return { error: "Gagal mengarsipkan laporan" };
    }
}

export async function deleteAdminReport(
    reportNumber: string,
    confirmationReportNumber: string = "",
): Promise<{ success?: true; error?: string }> {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        await validateCSRF(await headers());

        if (!user || user.role !== "ADMIN") {
            return { error: "Hanya Admin yang dapat menghapus laporan" };
        }
        if (
            !isDeleteConfirmationValid(
                reportNumber,
                confirmationReportNumber,
            )
        ) {
            return { error: "Konfirmasi nomor laporan tidak sesuai" };
        }

        const result = await prisma.$transaction(async (tx) => {
            const report = await tx.report.findUnique({
                where: { reportNumber },
                select: {
                    reportNumber: true,
                    status: true,
                    pjumExportedAt: true,
                    branchName: true,
                    storeCode: true,
                    storeName: true,
                },
            });
            if (!report) {
                return { error: "Laporan tidak ditemukan" };
            }
            if (report.branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
                return {
                    error: "Laporan HEAD OFFICE tidak dapat dihapus dari dashboard admin",
                };
            }

            const relatedPjums = await tx.pjumExport.findMany({
                where: { reportNumbers: { has: reportNumber } },
                select: {
                    id: true,
                    status: true,
                    reportNumbers: true,
                },
            });
            const detachments = resolvePjumDetachments(
                reportNumber,
                relatedPjums,
            );

            if (!detachments.ok) {
                return { error: detachments.error };
            }
            const pjumSnapshots = new Map(
                detachments.snapshots.map(({ id, reportNumbers }) => [
                    id,
                    reportNumbers,
                ]),
            );

            for (const id of detachments.deleteIds) {
                const reportNumbers = pjumSnapshots.get(id);
                if (!reportNumbers) throw new ReportRetentionConflictError();

                const deletion = await tx.pjumExport.deleteMany({
                    where: {
                        id,
                        status: { not: "APPROVED" },
                        reportNumbers: {
                            equals: reportNumbers,
                            has: reportNumber,
                        },
                    },
                });
                assertRetentionMutationApplied(deletion.count);
            }
            for (const update of detachments.updates) {
                const reportNumbers = pjumSnapshots.get(update.id);
                if (!reportNumbers) throw new ReportRetentionConflictError();

                const detachment = await tx.pjumExport.updateMany({
                    where: {
                        id: update.id,
                        status: { not: "APPROVED" },
                        reportNumbers: {
                            equals: reportNumbers,
                            has: reportNumber,
                        },
                    },
                    data: { reportNumbers: { set: update.reportNumbers } },
                });
                assertRetentionMutationApplied(detachment.count);
            }

            await tx.approvalLog.deleteMany({ where: { reportNumber } });
            await tx.activityLog.deleteMany({ where: { reportNumber } });
            const deletion = await tx.report.deleteMany({
                where: {
                    reportNumber,
                    status: report.status,
                    pjumExportedAt: report.pjumExportedAt,
                },
            });
            assertRetentionMutationApplied(deletion.count);

            return { success: true as const, report };
        });

        if ("error" in result) {
            return result;
        }

        [
            "/dashboard/reports",
            "/dashboard/materials",
            "/dashboard/pjum",
            "/dashboard/preventive",
            "/dashboard",
            `/reports/${reportNumber}`,
            `/dashboard/reports/${reportNumber}`,
        ].forEach((path) => revalidatePath(path));

        logger.info(
            {
                operation: "deleteAdminReport",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                reportNumber,
                userId: user.NIK,
                branchName: result.report.branchName,
                storeCode: result.report.storeCode,
                storeName: result.report.storeName,
            },
            "Deleted admin report successfully",
        );

        return { success: true };
    } catch (error) {
        if (error instanceof ReportRetentionConflictError) {
            return { error: error.message };
        }

        logger.error(
            {
                operation: "deleteAdminReport",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                reportNumber,
            },
            "Failed to delete admin report",
            error,
        );
        return { error: "Gagal menghapus laporan" };
    }
}
