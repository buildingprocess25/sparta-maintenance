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

    const where: Record<string, unknown> = {
        createdByNIK: user.NIK,
        status: {
            in: status
                ? [status]
                : ["DRAFT", "PENDING_ESTIMATION", "ESTIMATION_APPROVED", "ESTIMATION_REJECTED_REVISION", "ESTIMATION_REJECTED", "IN_PROGRESS", "PENDING_REVIEW", "REVIEW_REJECTED_REVISION", "APPROVED_BMC"],
        },
    };

    const dateBounds = resolveDateRange(dateRange as DateRangeFilter | undefined);
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
