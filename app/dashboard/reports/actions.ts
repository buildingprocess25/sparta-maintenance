"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export type AdminReportFilters = {
    search?: string;
    status?: string;
    bmsQuery?: string;
    branchName?: string;
    fromDate?: string;
    toDate?: string;
};

export async function getAdminReports(
    cursor: string | null,
    limit: number = 20,
    filters: AdminReportFilters
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            throw new Error("Unauthorized");
        }

        const where: Prisma.ReportWhereInput = {};

        // Search: reportNumber, storeName, storeCode
        if (filters.search) {
            where.OR = [
                { reportNumber: { contains: filters.search, mode: "insensitive" } },
                { storeName: { contains: filters.search, mode: "insensitive" } },
                { storeCode: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.status && filters.status !== "all") {
            where.status = filters.status as Prisma.EnumReportStatusFilter["equals"];
        }

        if (filters.bmsQuery) {
            where.OR = [
                ...(where.OR || []),
                { createdByNIK: { contains: filters.bmsQuery, mode: "insensitive" } },
                { createdBy: { name: { contains: filters.bmsQuery, mode: "insensitive" } } },
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        if (filters.fromDate || filters.toDate) {
            where.createdAt = {};
            if (filters.fromDate) {
                where.createdAt.gte = new Date(filters.fromDate);
            }
            if (filters.toDate) {
                const end = new Date(filters.toDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        
        // Count total reports for the given filters
        const totalCount = await prisma.report.count({ where });

        const reports = await prisma.report.findMany({
            where,
            take: limit + 1, // Take one extra to determine if there's a next page
            skip: cursor ? 1 : 0,
            cursor: cursor ? { reportNumber: cursor } : undefined,
            orderBy: { updatedAt: "desc" },
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
                createdByNIK: true,
                createdBy: {
                    select: {
                        name: true,
                        NIK: true,
                    },
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
            reports: reports.map(r => ({
                ...r,
                totalEstimation: Number(r.totalEstimation),
                totalReal: r.totalReal ? Number(r.totalReal) : null,
            })),
            nextCursor,
            totalCount,
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
