import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { Prisma } from "@prisma/client";
import type { MaterialEstimationJson } from "@/types/report";
import { getAdminBranchHierarchy } from "@/app/dashboard/queries";

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
    preventiveQuarter?: "all" | 1 | 2 | 3 | 4;
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
    storeCode: string | null;
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
    q1By: string;
    q1Date: Date | null;
    q2By: string;
    q2Date: Date | null;
    q3By: string;
    q3Date: Date | null;
    q4By: string;
    q4Date: Date | null;
};

// (MaterialEstimationJson imported from @/types/report — used directly below)

type PreventiveExportReportRow = {
    storeCode: string | null;
    createdAt: Date;
    createdByNIK: string;
    createdByName: string | null;
};

// ─── Helper: build Report where clause ───────────────────────────────────────

function buildReportWhere(filter: ExportFilter): Prisma.ReportWhereInput {
    const where: Prisma.ReportWhereInput = {
        // Exclude DRAFT-only records from export
        status: { not: "DRAFT" },
        NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
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
        where.status = "COMPLETED";
        where.pjumExportedAt = { not: null }; // sudah PJUM

        const reports = await prisma.report.findMany({
            where,
            orderBy: [{ createdAt: "asc" }, { reportNumber: "asc" }],
            select: {
                reportNumber: true,
                storeCode: true,
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
                    storeCode: report.storeCode || "",
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
        const where: Prisma.PjumExportWhereInput = {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        };

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
        const result = await prisma.$queryRaw<{ branchName: string | null }[]>`
            SELECT DISTINCT "branchNames"[1] AS "branchName"
            FROM "User"
            WHERE NOT (${EXCLUDED_ADMIN_BRANCH_NAME} = ANY("branchNames"))
              AND "branchNames"[1] IS NOT NULL
              AND "branchNames"[1] <> ${EXCLUDED_ADMIN_BRANCH_NAME}
        `;

        return Array.from(
            new Set(
                result
                    .map((row) => row.branchName)
                    .filter(
                        (branchName): branchName is string =>
                            Boolean(branchName) &&
                            branchName !== EXCLUDED_ADMIN_BRANCH_NAME,
                    ),
            ),
        ).sort((a, b) => a.localeCompare(b, "id-ID"));
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

function normalizePreventiveQuarter(
    value: ExportFilter["preventiveQuarter"],
): "all" | 1 | 2 | 3 | 4 {
    if (value === 1 || value === 2 || value === 3 || value === 4) {
        return value;
    }

    return "all";
}

function getPreventiveExportWindow(
    year: number,
    quarter: "all" | 1 | 2 | 3 | 4,
) {
    if (quarter === "all") {
        return {
            start: new Date(year, 0, 1),
            endExclusive: new Date(year + 1, 0, 1),
        };
    }

    const startMonth = (quarter - 1) * 3;
    return {
        start: new Date(year, startMonth, 1),
        endExclusive: new Date(year, startMonth + 3, 1),
    };
}

function getQuarterKeyFromDate(date: Date): "q1" | "q2" | "q3" | "q4" {
    const month = date.getMonth();
    if (month <= 2) return "q1";
    if (month <= 5) return "q2";
    if (month <= 8) return "q3";
    return "q4";
}

function normalizeBranchFilter(branchName: ExportFilter["branchName"]) {
    if (!branchName || branchName === "all") return null;

    const branches = Array.isArray(branchName) ? branchName : [branchName];
    const filtered = branches.filter(
        (branch) =>
            branch &&
            branch !== "all" &&
            branch !== EXCLUDED_ADMIN_BRANCH_NAME,
    );

    return filtered.length > 0 ? filtered : null;
}

async function resolvePreventiveBranchFilter(
    branchName: ExportFilter["branchName"],
) {
    const selectedBranches = normalizeBranchFilter(branchName);
    if (!selectedBranches) return null;

    const hierarchy = await getAdminBranchHierarchy();
    const resolved = new Set(selectedBranches);

    for (const [branch, parent] of hierarchy.parentMap.entries()) {
        if (selectedBranches.includes(parent)) {
            resolved.add(branch);
        }
    }

    resolved.delete(EXCLUDED_ADMIN_BRANCH_NAME);
    return Array.from(resolved);
}

export async function fetchPreventiveExportRows(
    filter: ExportFilter,
): Promise<PreventiveExportRow[]> {
    try {
        const year = filter.year || new Date().getFullYear();
        const quarter = normalizePreventiveQuarter(filter.preventiveQuarter);
        const { start, endExclusive } = getPreventiveExportWindow(year, quarter);
        const selectedBranchNames = await resolvePreventiveBranchFilter(
            filter.branchName,
        );

        const whereStore: Prisma.StoreWhereInput = {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
        };
        if (selectedBranchNames) {
            whereStore.branchName = { in: selectedBranchNames };
        }

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

        if (storeCodes.length === 0) {
            return [];
        }

        const reportPredicates: Prisma.Sql[] = [
            Prisma.sql`r."status" = 'COMPLETED'::"ReportStatus"`,
            Prisma.sql`r."createdAt" >= ${start}`,
            Prisma.sql`r."createdAt" < ${endExclusive}`,
        ];

        if (filter.searchQuery) {
            reportPredicates.push(
                Prisma.sql`r."storeCode" IN (${Prisma.join(storeCodes)})`,
            );
        }

        if (selectedBranchNames) {
            reportPredicates.push(
                Prisma.sql`r."branchName" IN (${Prisma.join(selectedBranchNames)})`,
            );
        } else {
            reportPredicates.push(
                Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`,
            );
        }

        const reports: PreventiveExportReportRow[] = await prisma.$queryRaw`
            SELECT
                r."storeCode",
                r."createdAt",
                r."createdByNIK",
                u."name" AS "createdByName"
            FROM "Report" r
            LEFT JOIN "User" u ON u."NIK" = r."createdByNIK"
            WHERE ${Prisma.join(reportPredicates, " AND ")}
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(r."items") AS item
                WHERE item->>'itemId' LIKE 'I%'
                   OR item->>'preventiveCondition' IS NOT NULL
              )
            ORDER BY r."createdAt" DESC
        `;

        const reportsByStore = new Map<string, PreventiveExportReportRow[]>();
        for (const report of reports) {
            if (!report.storeCode) continue;

            const current = reportsByStore.get(report.storeCode) ?? [];
            current.push(report);
            reportsByStore.set(report.storeCode, current);
        }

        const rows: PreventiveExportRow[] = stores.map((store) => {
            const storeReports = reportsByStore.get(store.code) ?? [];

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
                report: PreventiveExportReportRow,
            ) => {
                const existing = quarterInfo[key];
                if (!existing || report.createdAt > existing.doneAt) {
                    quarterInfo[key] = {
                        doneAt: report.createdAt,
                        bmsName: report.createdByName ?? "",
                        bmsNIK: report.createdByNIK ?? "",
                    };
                }
            };

            const formatQuarter = (
                info: { doneAt: Date; bmsName: string; bmsNIK: string } | null,
            ) => {
                if (!info) {
                    return { by: "", date: null };
                }

                return {
                    by: info.bmsName || info.bmsNIK || "",
                    date: info.doneAt,
                };
            };

            for (const report of storeReports) {
                const quarterKey = getQuarterKeyFromDate(report.createdAt);
                if (quarter === "all" || quarterKey === `q${quarter}`) {
                    updateQuarter(quarterKey, report);
                }
            }

            const q1 = formatQuarter(quarterInfo.q1);
            const q2 = formatQuarter(quarterInfo.q2);
            const q3 = formatQuarter(quarterInfo.q3);
            const q4 = formatQuarter(quarterInfo.q4);

            return {
                storeCode: store.code,
                storeName: store.name,
                branchName: store.branchName,
                q1By: q1.by,
                q1Date: q1.date,
                q2By: q2.by,
                q2Date: q2.date,
                q3By: q3.by,
                q3Date: q3.date,
                q4By: q4.by,
                q4Date: q4.date,
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
