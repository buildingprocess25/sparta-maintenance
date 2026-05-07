"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type { ReportItemJson } from "@/types/report";

export type AdminPreventiveFilters = {
    search?: string;
    branchName?: string;
    year: number;
};

export type PreventiveQuarterInfo = {
    doneAt: string; // ISO string
    bmsName: string;
    bmsNIK: string;
};

export type PreventiveRow = {
    storeCode: string;
    storeName: string;
    branchName: string;
    q1: PreventiveQuarterInfo | null; // Jan-Mar
    q2: PreventiveQuarterInfo | null; // Apr-Jun
    q3: PreventiveQuarterInfo | null; // Jul-Sep
    q4: PreventiveQuarterInfo | null; // Okt-Des
};

export async function getAdminPreventive(
    cursor: string | null,
    limit: number = 20,
    filters: AdminPreventiveFilters,
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const where: Prisma.StoreWhereInput = {};

        if (filters.search) {
            where.OR = [
                { code: { contains: filters.search, mode: "insensitive" } },
                { name: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        const totalCount = await prisma.store.count({ where });

        const stores = await prisma.store.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { code: cursor } : undefined,
            orderBy: { code: "asc" },
            select: {
                code: true,
                name: true,
                branchName: true,
            },
        });

        let nextCursor: string | null = null;
        if (stores.length > limit) {
            const nextItem = stores.pop();
            nextCursor = nextItem!.code;
        }

        // Fetch reports for these stores in the given year
        const yearStart = new Date(filters.year, 0, 1);
        const yearEnd = new Date(filters.year + 1, 0, 1); // Exclusive

        const storeCodes = stores.map((s) => s.code);

        const reports = await prisma.report.findMany({
            where: {
                storeCode: { in: storeCodes },
                status: { not: "DRAFT" },
                createdAt: {
                    gte: yearStart,
                    lt: yearEnd,
                },
            },
            select: {
                storeCode: true,
                createdAt: true,
                items: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
            },
        });

        const rows: PreventiveRow[] = stores.map((store) => {
            const storeReports = reports.filter(
                (r) => r.storeCode === store.code,
            );

            const quarterInfo: Record<
                "q1" | "q2" | "q3" | "q4",
                { doneAt: Date; bmsName: string; bmsNIK: string } | null
            > = {
                q1: null,
                q2: null,
                q3: null,
                q4: null,
            };

            const updateQuarter = (
                key: "q1" | "q2" | "q3" | "q4",
                report: (typeof reports)[number],
            ) => {
                const existing = quarterInfo[key];
                if (!existing || report.createdAt > existing.doneAt) {
                    quarterInfo[key] = {
                        doneAt: report.createdAt,
                        bmsName: report.createdBy?.name ?? "",
                        bmsNIK: report.createdByNIK ?? "",
                    };
                }
            };

            for (const report of storeReports) {
                const items = report.items as ReportItemJson[] | null;
                if (!items || !Array.isArray(items)) continue;

                const hasCategoryI = items.some((item) =>
                    item.itemId.startsWith("I"),
                );
                if (!hasCategoryI) continue;

                const month = new Date(report.createdAt).getMonth();
                if (month >= 0 && month <= 2) updateQuarter("q1", report);
                else if (month >= 3 && month <= 5) updateQuarter("q2", report);
                else if (month >= 6 && month <= 8) updateQuarter("q3", report);
                else if (month >= 9 && month <= 11) updateQuarter("q4", report);
            }

            const toClientInfo = (
                info: { doneAt: Date; bmsName: string; bmsNIK: string } | null,
            ): PreventiveQuarterInfo | null =>
                info
                    ? {
                          doneAt: info.doneAt.toISOString(),
                          bmsName: info.bmsName,
                          bmsNIK: info.bmsNIK,
                      }
                    : null;

            return {
                storeCode: store.code,
                storeName: store.name,
                branchName: store.branchName,
                q1: toClientInfo(quarterInfo.q1),
                q2: toClientInfo(quarterInfo.q2),
                q3: toClientInfo(quarterInfo.q3),
                q4: toClientInfo(quarterInfo.q4),
            };
        });

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "getAdminPreventive",
                correlationId,
                durationMs,
                count: stores.length,
            },
            "Fetched admin preventive successfully",
        );

        return {
            rows,
            nextCursor,
            totalCount,
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminPreventive", correlationId, durationMs },
            "Failed to fetch admin preventive",
            error,
        );
        throw new Error("Failed to load preventive data");
    }
}

export async function getReportYears() {
    try {
        const firstReport = await prisma.report.findFirst({
            where: { status: { not: "DRAFT" } },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
        });

        const lastReport = await prisma.report.findFirst({
            where: { status: { not: "DRAFT" } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });

        if (!firstReport || !lastReport) {
            return [new Date().getFullYear()];
        }

        const startYear = firstReport.createdAt.getFullYear();
        const endYear = lastReport.createdAt.getFullYear();
        const years: number[] = [];

        for (let y = endYear; y >= startYear; y--) {
            years.push(y);
        }

        return years;
    } catch (error) {
        logger.error(
            { operation: "getReportYears" },
            "Failed to fetch report years",
            error,
        );
        return [new Date().getFullYear()];
    }
}
