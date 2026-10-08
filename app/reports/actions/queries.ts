"use server";

import prisma from "@/lib/prisma";
import { resolveReportTotalRealisasi } from "@/lib/realisasi";
import { requireAuth, requireRole } from "@/lib/authorization";
import type { ReportFilters, DateRangeFilter } from "./types";
import { resolveDateRange } from "./types";
import { Prisma } from "@prisma/client";
import { isRecordedPreventiveReport } from "@/lib/report-preventive";
import { completePreventiveEvidenceSql } from "@/lib/report-preventive-sql";
import { ARCHIVED_PREVENTIVE_STATUS } from "@/lib/report-status";
import {
    getJakartaCurrentQuarter,
    getJakartaQuarterWindow,
    getJakartaYear,
} from "@/lib/time";
import { isBranchWideBmsCoverage } from "@/lib/bms-coverage-config";

export async function getStoresByBranch(branchName: string) {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && !user.branchNames.includes(branchName)) {
        throw new Error(
            "Anda hanya bisa mengakses toko dari cabang Anda sendiri",
        );
    }

    const stores = await prisma.store.findMany({
        where: { branchName, isActive: true },
        orderBy: { name: "asc" },
        select: {
            code: true,
            name: true,
            brand: true,
        },
    });

    const year = getJakartaYear();
    const quarter = getJakartaCurrentQuarter();
    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);

    // Fetch all non-DRAFT reports for this branch in the current quarter
    const reportsThisQuarter = await prisma.report.findMany({
        where: {
            store: {
                branchName
            },
            status: { not: "DRAFT" },
            createdAt: { gte: start, lt: endExclusive },
        },
        select: { storeCode: true, status: true, items: true },
    });

    const storesWithPreventive = new Set<string>();
    for (const report of reportsThisQuarter) {
        if (report.storeCode && isRecordedPreventiveReport(report)) {
            storesWithPreventive.add(report.storeCode);
        }
    }

    return stores.map((store) => ({
        ...store,
        hasPreventiveChecklist: storesWithPreventive.has(store.code),
    }));
}

export async function getAssignedStoresForBms(bmsNIK: string) {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && user.NIK !== bmsNIK) {
        throw new Error("Anda hanya dapat mengakses toko coverage Anda sendiri");
    }

    const branchWideMode = isBranchWideBmsCoverage();

    const storeWhere: Prisma.StoreWhereInput = branchWideMode
        ? {
              isActive: true,
              branchName: { in: user.branchNames },
          }
        : {
              isActive: true,
              OR: [
                  // 1. Toko yang secara spesifik di-assign aktif ke BMS ini
                  {
                      storeAssignments: {
                          some: {
                              bmsNIK,
                              isActive: true,
                          },
                      },
                  },
                  // 2. Fallback: Toko di cabang BMS ini yang BELUM memiliki BMS penanggung jawab aktif (unassigned / vacant)
                  {
                      branchName: { in: user.branchNames },
                      storeAssignments: {
                          none: {
                              isActive: true,
                          },
                      },
                  },
              ],
          };

    const stores = await prisma.store.findMany({
        where: storeWhere,
        orderBy: { name: "asc" },
        select: {
            code: true,
            name: true,
            brand: true,
        },
    });

    const year = getJakartaYear();
    const quarter = getJakartaCurrentQuarter();
    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);

    const storeCodes = stores.map((s) => s.code);
    const reportsThisQuarter = storeCodes.length > 0 ? await prisma.report.findMany({
        where: {
            storeCode: { in: storeCodes },
            status: { not: "DRAFT" },
            createdAt: { gte: start, lt: endExclusive },
        },
        select: { storeCode: true, status: true, items: true },
    }) : [];

    const storesWithPreventive = new Set<string>();
    for (const report of reportsThisQuarter) {
        if (report.storeCode && isRecordedPreventiveReport(report)) {
            storesWithPreventive.add(report.storeCode);
        }
    }

    return stores.map((store) => ({
        ...store,
        hasPreventiveChecklist: storesWithPreventive.has(store.code),
    }));
}

export async function getMyReports(filters: ReportFilters = {}) {
    const user = await requireRole("BMS");

    const { search, status, dateRange, fromDate, toDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Include COMPLETED by default so BMS can see their full report history
    const statusList = (
        status
            ? Array.isArray(status)
                ? status
                : [status]
            : [
                  "DRAFT",
                  "PENDING_ESTIMATION",
                  "PENDING_CHECKLIST_REVIEW",
                  "ESTIMATION_APPROVED",
                  "ESTIMATION_REJECTED_REVISION",
                  "ESTIMATION_REJECTED",
                  "IN_PROGRESS",
                  "PENDING_REVIEW",
                  "APPROVED_BMC",
                  "REVIEW_REJECTED_REVISION",
                  "COMPLETED",
              ]
    ).filter((value) => value !== ARCHIVED_PREVENTIVE_STATUS);

    const where: Record<string, unknown> = {
        createdByNIK: user.NIK,
        status: {
            in: statusList,
        },
    };

    if (dateRange === "custom" && fromDate && toDate) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { gte: start, lte: end };
    } else {
        const dateBounds = resolveDateRange(
            dateRange as DateRangeFilter | undefined,
        );
        if (dateBounds) {
            where.createdAt = dateBounds;
        }
    }

    if (search) {
        where.OR = [
            { reportNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
            { storeCode: { contains: search, mode: "insensitive" } },
            { branchName: { contains: search, mode: "insensitive" } },
        ];
    }

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                reportNumber: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                totalReal: true,
                items: true,
                createdAt: true,
                updatedAt: true,
                finishedAt: true,
                completedPdfPath: true,
                reportFinalDriveUrl: true,
            },
        }),
        prisma.report.count({ where }),
    ]);

    const reportsWithCount = reports.map((report) => {
        const itemsArr = Array.isArray(report.items)
            ? (report.items as unknown as import("@/types/report").ReportItemJson[])
            : [];

        return {
            ...report,
            _count: { items: itemsArr.length },
            rusakCount: itemsArr.filter((i) => i.condition === "RUSAK").length,
            totalRealisasi: resolveReportTotalRealisasi(
                report.totalReal,
                report.items,
            ),
        };
    });

    return { reports: reportsWithCount, total };
}

export async function getLastCategoryIDate(storeCode: string) {
    await requireAuth();

    const [report] = await prisma.$queryRaw<Array<{ createdAt: Date }>>`
        SELECT r."createdAt"
        FROM "Report" r
        WHERE r."storeCode" = ${storeCode}
          AND ${completePreventiveEvidenceSql({
              statusColumn: Prisma.sql`r."status"`,
              itemsColumn: Prisma.sql`r."items"`,
          })}
        ORDER BY r."createdAt" DESC
        LIMIT 1
    `;

    return report?.createdAt.toISOString() ?? null;
}

export async function getApprovalReports(params: {
    status?: string;
    search?: string;
    /** Filter by BMS name (free-text, case-insensitive) */
    bms?: string;
    dateRange?: DateRangeFilter;
    page?: number;
    limit?: number;
}) {
    const user = await requireRole(["BMC", "BNM_MANAGER", "ADMIN"]);

    const {
        status: statusParam,
        search,
        bms,
        dateRange,
        page = 1,
        limit = 10,
    } = params;
    const skip = (page - 1) * limit;

    const ALL_NON_DRAFT_STATUSES = [
        "PENDING_ESTIMATION",
        "PENDING_CHECKLIST_REVIEW",
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED_REVISION",
        "ESTIMATION_REJECTED",
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "APPROVED_BMC",
        "REVIEW_REJECTED_REVISION",
        "COMPLETED",
    ];

    const defaultStatuses =
        user.role === "BNM_MANAGER"
            ? ["APPROVED_BMC"]
            : user.role === "ADMIN"
              ? ALL_NON_DRAFT_STATUSES
              : ["PENDING_ESTIMATION", "PENDING_CHECKLIST_REVIEW", "PENDING_REVIEW"]; // BMC

    const normalizedStatus = statusParam?.toUpperCase();
    const activeStatuses: string[] =
        !normalizedStatus || normalizedStatus === "ALL"
            ? defaultStatuses
            : normalizedStatus === "VIEW_ALL"
              ? ALL_NON_DRAFT_STATUSES
              : ALL_NON_DRAFT_STATUSES.includes(normalizedStatus)
                ? [normalizedStatus]
                : defaultStatuses;

    const branchFilter =
        (user.role === "BMC" || user.role === "BNM_MANAGER") &&
        user.branchNames.length > 0
            ? { branchName: { in: user.branchNames } }
            : {};

    const dateBounds = resolveDateRange(dateRange);

    const searchFilter = search
        ? {
              OR: [
                  {
                      reportNumber: {
                          contains: search,
                          mode: "insensitive" as const,
                      },
                  },
                  {
                      storeName: {
                          contains: search,
                          mode: "insensitive" as const,
                      },
                  },
                  {
                      storeCode: {
                          contains: search,
                          mode: "insensitive" as const,
                      },
                  },
                  {
                      branchName: {
                          contains: search,
                          mode: "insensitive" as const,
                      },
                  },
              ],
          }
        : {};

    // Filter by BMS reporter name (free-text search on createdBy.name)
    const bmsFilter = bms
        ? {
              createdBy: {
                  name: { contains: bms, mode: "insensitive" as const },
              },
          }
        : {};

    const where = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: { in: activeStatuses as any },
        ...branchFilter,
        ...(dateBounds ? { updatedAt: dateBounds } : {}),
        ...searchFilter,
        ...bmsFilter,
    };

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                reportNumber: true,
                storeName: true,
                storeCode: true,
                branchName: true,
                status: true,
                totalEstimation: true,
                createdAt: true,
                updatedAt: true,
                finishedAt: true,
                completedPdfPath: true,
                reportFinalDriveUrl: true,
                createdBy: {
                    select: { name: true },
                },
            },
        }),
        prisma.report.count({ where }),
    ]);

    return {
        reports: reports.map((r) => ({
            ...r,
            totalEstimation: Number(r.totalEstimation),
            createdByName: r.createdBy.name,
            completedPdfPath: r.completedPdfPath,
            reportFinalDriveUrl: r.reportFinalDriveUrl,
        })),
        total,
    };
}
