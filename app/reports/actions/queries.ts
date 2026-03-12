"use server";

import prisma from "@/lib/prisma";
import type { ReportItemJson } from "@/types/report";
import { requireAuth, requireRole } from "@/lib/authorization";
import type { ReportFilters, DateRangeFilter } from "./types";
import { resolveDateRange } from "./types";

export async function getStoresByBranch(branchName: string) {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && !user.branchNames.includes(branchName)) {
        throw new Error(
            "Anda hanya bisa mengakses toko dari cabang Anda sendiri",
        );
    }

    const stores = await prisma.store.findMany({
        where: { branchName },
        orderBy: { name: "asc" },
        select: {
            code: true,
            name: true,
        },
    });

    return stores;
}

export async function getMyReports(filters: ReportFilters = {}) {
    const user = await requireRole("BMS");

    const { search, status, dateRange, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const statusList = status
        ? Array.isArray(status)
            ? status
            : [status]
        : [
              "DRAFT",
              "PENDING_ESTIMATION",
              "ESTIMATION_APPROVED",
              "ESTIMATION_REJECTED_REVISION",
              "ESTIMATION_REJECTED",
              "IN_PROGRESS",
              "PENDING_REVIEW",
              "REVIEW_REJECTED_REVISION",
          ];

    const where: Record<string, unknown> = {
        createdByNIK: user.NIK,
        status: {
            in: statusList,
        },
    };

    const dateBounds = resolveDateRange(
        dateRange as DateRangeFilter | undefined,
    );
    if (dateBounds) {
        where.createdAt = dateBounds;
    }

    if (search) {
        where.OR = [
            { reportNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
            { branchName: { contains: search, mode: "insensitive" } },
        ];
    }

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
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
        };
    });

    return { reports: reportsWithCount, total };
}

export async function getFinishedReports(filters: ReportFilters = {}) {
    const user = await requireRole("BMS");

    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        createdByNIK: user.NIK,
        status: "COMPLETED",
    };

    if (search) {
        where.OR = [
            { reportNumber: { contains: search, mode: "insensitive" } },
            { storeName: { contains: search, mode: "insensitive" } },
        ];
    }

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.report.count({ where }),
    ]);

    const reportsWithCount = reports.map((report) => ({
        ...report,
        _count: {
            items: Array.isArray(report.items)
                ? (report.items as unknown[]).length
                : 0,
        },
    }));

    return { reports: reportsWithCount, total };
}

export async function getLastCategoryIDate(storeCode: string) {
    await requireAuth();

    const reports = await prisma.report.findMany({
        where: {
            storeCode: storeCode,
            status: { not: "DRAFT" },
        },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            items: true,
        },
        take: 10,
    });

    for (const report of reports) {
        const items = report.items as ReportItemJson[] | null;
        if (items && Array.isArray(items)) {
            const hasCategoryI = items.some((item) =>
                item.itemId.startsWith("I"),
            );
            if (hasCategoryI) {
                return report.createdAt.toISOString();
            }
        }
    }

    return null;
}

export async function getApprovalReports(params: {
    status?: string;
    search?: string;
    dateRange?: DateRangeFilter;
    page?: number;
    limit?: number;
}) {
    const user = await requireRole(["BMC", "BNM_MANAGER", "ADMIN"]);

    const {
        status: statusParam,
        search,
        dateRange,
        page = 1,
        limit = 10,
    } = params;
    const skip = (page - 1) * limit;

    const ALL_NON_DRAFT_STATUSES = [
        "PENDING_ESTIMATION",
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED_REVISION",
        "ESTIMATION_REJECTED",
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "REVIEW_REJECTED_REVISION",
        "COMPLETED",
    ];

    const defaultStatuses =
        user.role === "BNM_MANAGER"
            ? ["COMPLETED"]
            : user.role === "ADMIN"
              ? ALL_NON_DRAFT_STATUSES
              : ["PENDING_ESTIMATION", "PENDING_REVIEW"]; // BMC

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
                      branchName: {
                          contains: search,
                          mode: "insensitive" as const,
                      },
                  },
              ],
          }
        : {};

    const where = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: { in: activeStatuses as any },
        ...branchFilter,
        ...(dateBounds ? { updatedAt: dateBounds } : {}),
        ...searchFilter,
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
        })),
        total,
    };
}
