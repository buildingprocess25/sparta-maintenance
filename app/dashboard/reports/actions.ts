"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { revalidatePath } from "next/cache";

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

        const where: Prisma.ReportWhereInput = {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        };

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

export async function deleteAdminReport(reportNumber: string) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
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

        if (report.branchName === EXCLUDED_ADMIN_BRANCH_NAME) {
            return { error: "Laporan HEAD OFFICE tidak dapat dihapus dari dashboard admin" };
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
