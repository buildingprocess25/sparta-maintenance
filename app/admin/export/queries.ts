import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type ExportFilter = {
    fromDate?: string; // ISO date string
    toDate?: string; // ISO date string
    branchName?: string | string[];
    status?: string;
    bmsQuery?: string;
    search?: string;
    searchQuery?: string;
    year?: number;
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

// ─── Sheet 4: Preventive rows ───────────────────────────────────────────────────

export type PreventiveExportRow = {
    storeCode: string;
    storeName: string;
    branchName: string;
    q1: string; // "Sudah" or "-"
    q2: string;
    q3: string;
    q4: string;
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
            (where.createdAt as Prisma.DateTimeFilter).gte = new Date(
                filter.fromDate,
            );
        }
        if (filter.toDate) {
            // Include the entire toDate day
            const end = new Date(filter.toDate);
            end.setHours(23, 59, 59, 999);
            (where.createdAt as Prisma.DateTimeFilter).lte = end;
        }
    }

    if (filter.branchName) {
        if (Array.isArray(filter.branchName)) {
            where.branchName = { in: filter.branchName };
        } else {
            where.branchName = filter.branchName;
        }
    }

    if (filter.status && filter.status !== "all") {
        where.status = filter.status as Prisma.EnumReportStatusFilter["equals"];
    }

    if (filter.search) {
        where.OR = [
            { reportNumber: { contains: filter.search, mode: "insensitive" } },
            { storeName: { contains: filter.search, mode: "insensitive" } },
            { storeCode: { contains: filter.search, mode: "insensitive" } },
        ];
    }

    if (filter.bmsQuery) {
        where.OR = [
            ...(where.OR || []),
            {
                createdByNIK: {
                    contains: filter.bmsQuery,
                    mode: "insensitive",
                },
            },
            {
                createdBy: {
                    name: { contains: filter.bmsQuery, mode: "insensitive" },
                },
            },
        ];
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
            {
                operation: "fetchReportExportRows",
                filter: JSON.stringify(filter),
            },
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
            const items =
                report.estimations as unknown as MaterialEstimationJson[];
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
            {
                operation: "fetchMaterialExportRows",
                filter: JSON.stringify(filter),
            },
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
                (where.createdAt as Prisma.DateTimeFilter).gte = new Date(
                    filter.fromDate,
                );
            }
            if (filter.toDate) {
                const end = new Date(filter.toDate);
                end.setHours(23, 59, 59, 999);
                (where.createdAt as Prisma.DateTimeFilter).lte = end;
            }
        }

        if (filter.branchName) {
            if (Array.isArray(filter.branchName)) {
                where.branchName = { in: filter.branchName };
            } else {
                where.branchName = filter.branchName;
            }
        }

        if (filter.bmsQuery) {
            where.OR = [
                { bmsNIK: { contains: filter.bmsQuery, mode: "insensitive" } },
                // Note: PjumExport doesn't store bmsName directly in DB, only NIK.
                // We'll search by NIK for now.
            ];
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
            approvedByName: e.approvedByNIK
                ? (nameMap.get(e.approvedByNIK) ?? e.approvedByNIK)
                : null,
            approvedAt: e.approvedAt,
        }));
    } catch (error) {
        logger.error(
            {
                operation: "fetchPjumExportRows",
                filter: JSON.stringify(filter),
            },
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

// ─── Query: Sheet 4 — Checklist Preventif ────────────────────────────────────

export async function fetchPreventiveExportRows(
    filter: ExportFilter,
): Promise<PreventiveExportRow[]> {
    try {
        if (
            !filter.branchName ||
            (Array.isArray(filter.branchName) &&
                filter.branchName.length !== 1) ||
            (!Array.isArray(filter.branchName) && filter.branchName === "all")
        ) {
            throw new Error("Satu cabang wajib dipilih untuk ekspor preventif");
        }

        const year = filter.year || new Date().getFullYear();

        const branchNameStr = Array.isArray(filter.branchName)
            ? filter.branchName[0]
            : filter.branchName;

        const whereStore: Prisma.StoreWhereInput = {
            branchName: branchNameStr,
        };

        if (filter.searchQuery) {
            whereStore.OR = [
                { code: { contains: filter.searchQuery, mode: "insensitive" } },
                { name: { contains: filter.searchQuery, mode: "insensitive" } },
            ];
        }

        const stores = await prisma.store.findMany({
            where: whereStore,
            orderBy: { code: "asc" },
            select: {
                code: true,
                name: true,
                branchName: true,
            },
        });

        const storeCodes = stores.map((s) => s.code);
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);

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

        const rows: PreventiveExportRow[] = stores.map((store) => {
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

            const dateFormatter = new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

            const formatQuarter = (
                info: { doneAt: Date; bmsName: string; bmsNIK: string } | null,
            ) => {
                if (!info) return "-";
                const dateLabel = dateFormatter.format(info.doneAt);
                const bmsLabel = info.bmsName || info.bmsNIK || "-";
                return `${dateLabel} - ${bmsLabel}`;
            };

            for (const report of storeReports) {
                const items = report.items as any[];
                if (items && Array.isArray(items)) {
                    const hasCategoryI = items.some(
                        (item) =>
                            item.itemId && String(item.itemId).startsWith("I"),
                    );
                    if (hasCategoryI) {
                        const month = new Date(report.createdAt).getMonth();
                        if (month >= 0 && month <= 2)
                            updateQuarter("q1", report);
                        else if (month >= 3 && month <= 5)
                            updateQuarter("q2", report);
                        else if (month >= 6 && month <= 8)
                            updateQuarter("q3", report);
                        else if (month >= 9 && month <= 11)
                            updateQuarter("q4", report);
                    }
                }
            }

            return {
                storeCode: store.code,
                storeName: store.name,
                branchName: store.branchName,
                q1: formatQuarter(quarterInfo.q1),
                q2: formatQuarter(quarterInfo.q2),
                q3: formatQuarter(quarterInfo.q3),
                q4: formatQuarter(quarterInfo.q4),
            };
        });

        return rows;
    } catch (error) {
        logger.error(
            {
                operation: "fetchPreventiveExportRows",
                filter: JSON.stringify(filter),
            },
            "Failed to fetch preventive export rows",
            error,
        );
        throw error;
    }
}
