import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type ExportFilter = {
    fromDate?: string; // ISO date string
    toDate?: string;   // ISO date string
    branchName?: string;
    status?: string;
    bmsNIK?: string;
};

// ─── Sheet 1: Report rows ─────────────────────────────────────────────────────

export type ReportExportRow = {
    reportNumber: string;
    createdAt: Date;
    branchName: string;
    storeCode: string | null;
    storeName: string;
    bmsNIK: string;
    bmsName: string;
    status: string;
    totalEstimation: number;
    totalReal: number | null;
    finishedAt: Date | null;
    pjumExportedAt: Date | null;
};

// ─── Sheet 2: Material/estimation rows (flattened from Report.estimations JSON)

export type MaterialExportRow = {
    reportNumber: string;
    storeName: string;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    materialName: string;
    quantity: number;
    unit: string;
    price: number;
    totalPrice: number;
};

// ─── Sheet 3: PJUM rows ───────────────────────────────────────────────────────

export type PjumExportRow = {
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    weekNumber: number;
    fromDate: Date;
    toDate: Date;
    status: string;
    reportCount: number;
    createdByName: string;
    createdAt: Date;
    approvedByName: string | null;
    approvedAt: Date | null;
};

// (MaterialEstimationJson imported from @/types/report — used directly below)

// ─── Helper: build Report where clause ───────────────────────────────────────

function buildReportWhere(filter: ExportFilter): Prisma.ReportWhereInput {
    const where: Prisma.ReportWhereInput = {
        // Exclude DRAFT-only records from export
        status: { not: "DRAFT" },
    };

    if (filter.fromDate || filter.toDate) {
        where.createdAt = {};
        if (filter.fromDate) {
            (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filter.fromDate);
        }
        if (filter.toDate) {
            // Include the entire toDate day
            const end = new Date(filter.toDate);
            end.setHours(23, 59, 59, 999);
            (where.createdAt as Prisma.DateTimeFilter).lte = end;
        }
    }

    if (filter.branchName) {
        where.branchName = filter.branchName;
    }

    if (filter.status && filter.status !== "all") {
        where.status = filter.status as Prisma.EnumReportStatusFilter["equals"];
    }

    if (filter.bmsNIK) {
        where.createdByNIK = filter.bmsNIK;
    }

    return where;
}

// ─── Query: Sheet 1 — Rekap Laporan ──────────────────────────────────────────

export async function fetchReportExportRows(
    filter: ExportFilter,
): Promise<ReportExportRow[]> {
    try {
        const where = buildReportWhere(filter);

        const reports = await prisma.report.findMany({
            where,
            orderBy: { createdAt: "asc" },
            select: {
                reportNumber: true,
                createdAt: true,
                branchName: true,
                storeCode: true,
                storeName: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
                status: true,
                totalEstimation: true,
                totalReal: true,
                finishedAt: true,
                pjumExportedAt: true,
            },
        });

        return reports.map((r) => ({
            reportNumber: r.reportNumber,
            createdAt: r.createdAt,
            branchName: r.branchName,
            storeCode: r.storeCode,
            storeName: r.storeName,
            bmsNIK: r.createdByNIK,
            bmsName: r.createdBy.name,
            status: r.status,
            totalEstimation: Number(r.totalEstimation),
            totalReal: r.totalReal !== null ? Number(r.totalReal) : null,
            finishedAt: r.finishedAt,
            pjumExportedAt: r.pjumExportedAt,
        }));
    } catch (error) {
        logger.error(
            { operation: "fetchReportExportRows", filter: JSON.stringify(filter) },
            "Failed to fetch report export rows",
            error,
        );
        throw error;
    }
}

// ─── Query: Sheet 2 — Rekap Material ─────────────────────────────────────────

export async function fetchMaterialExportRows(
    filter: ExportFilter,
): Promise<MaterialExportRow[]> {
    try {
        const where = buildReportWhere(filter);

        const reports = await prisma.report.findMany({
            where,
            orderBy: { createdAt: "asc" },
            select: {
                reportNumber: true,
                storeName: true,
                branchName: true,
                createdByNIK: true,
                createdBy: { select: { name: true } },
                estimations: true,
            },
        });

        const rows: MaterialExportRow[] = [];

        for (const report of reports) {
            const items = (report.estimations as unknown) as MaterialEstimationJson[];
            if (!Array.isArray(items) || items.length === 0) continue;

            for (const item of items) {
                rows.push({
                    reportNumber: report.reportNumber,
                    storeName: report.storeName,
                    branchName: report.branchName,
                    bmsNIK: report.createdByNIK,
                    bmsName: report.createdBy.name,
                    materialName: item.materialName ?? "",
                    quantity: Number(item.quantity ?? 0),
                    unit: item.unit ?? "",
                    price: Number(item.price ?? 0),
                    totalPrice: Number(item.totalPrice ?? 0),
                });
            }
        }

        return rows;
    } catch (error) {
        logger.error(
            { operation: "fetchMaterialExportRows", filter: JSON.stringify(filter) },
            "Failed to fetch material export rows",
            error,
        );
        throw error;
    }
}

// ─── Query: Sheet 3 — Rekap PJUM ─────────────────────────────────────────────

export async function fetchPjumExportRows(
    filter: ExportFilter,
): Promise<PjumExportRow[]> {
    try {
        const where: Prisma.PjumExportWhereInput = {};

        if (filter.fromDate || filter.toDate) {
            where.createdAt = {};
            if (filter.fromDate) {
                (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filter.fromDate);
            }
            if (filter.toDate) {
                const end = new Date(filter.toDate);
                end.setHours(23, 59, 59, 999);
                (where.createdAt as Prisma.DateTimeFilter).lte = end;
            }
        }

        if (filter.branchName) {
            where.branchName = filter.branchName;
        }

        if (filter.bmsNIK) {
            where.bmsNIK = filter.bmsNIK;
        }

        const exports = await prisma.pjumExport.findMany({
            where,
            orderBy: { createdAt: "asc" },
            select: {
                branchName: true,
                bmsNIK: true,
                weekNumber: true,
                fromDate: true,
                toDate: true,
                status: true,
                reportNumbers: true,
                createdByNIK: true,
                createdAt: true,
                approvedByNIK: true,
                approvedAt: true,
            },
        });

        // Collect unique NIKs to resolve names in one query
        const nikSet = new Set<string>();
        for (const e of exports) {
            nikSet.add(e.createdByNIK);
            nikSet.add(e.bmsNIK);
            if (e.approvedByNIK) nikSet.add(e.approvedByNIK);
        }

        const users = await prisma.user.findMany({
            where: { NIK: { in: Array.from(nikSet) } },
            select: { NIK: true, name: true },
        });
        const nameMap = new Map(users.map((u) => [u.NIK, u.name]));

        return exports.map((e) => ({
            branchName: e.branchName,
            bmsNIK: e.bmsNIK,
            bmsName: nameMap.get(e.bmsNIK) ?? e.bmsNIK,
            weekNumber: e.weekNumber,
            fromDate: e.fromDate,
            toDate: e.toDate,
            status: e.status,
            reportCount: e.reportNumbers.length,
            createdByName: nameMap.get(e.createdByNIK) ?? e.createdByNIK,
            createdAt: e.createdAt,
            approvedByName: e.approvedByNIK ? (nameMap.get(e.approvedByNIK) ?? e.approvedByNIK) : null,
            approvedAt: e.approvedAt,
        }));
    } catch (error) {
        logger.error(
            { operation: "fetchPjumExportRows", filter: JSON.stringify(filter) },
            "Failed to fetch PJUM export rows",
            error,
        );
        throw error;
    }
}

// ─── Query: Distinct branch names (for filter dropdown) ───────────────────────

export async function fetchAllBranchNames(): Promise<string[]> {
    try {
        const result = await prisma.report.findMany({
            distinct: ["branchName"],
            select: { branchName: true },
            orderBy: { branchName: "asc" },
        });
        return result.map((r) => r.branchName);
    } catch (error) {
        logger.error(
            { operation: "fetchAllBranchNames" },
            "Failed to fetch branch names",
            error,
        );
        return [];
    }
}
