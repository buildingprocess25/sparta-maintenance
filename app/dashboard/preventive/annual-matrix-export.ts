import type { Prisma } from "@prisma/client";
import { getJakartaQuarterKey, getJakartaYearWindow } from "@/lib/time";
import {
    type StoreBrandFilter,
} from "@/lib/store-brand-filter";

export type PreventiveMatrixExportStatus = "all" | "completed" | "pending";
export type PreventiveMatrixExportQuarter = 1 | 2 | 3 | 4;
export type PreventiveMatrixExportQuarterKey = "q1" | "q2" | "q3" | "q4";

export type PreventiveMatrixExportFilters = {
    branchName?: string;
    brand?: StoreBrandFilter;
    year: number;
    quarter: PreventiveMatrixExportQuarter;
    status: PreventiveMatrixExportStatus;
};

export type PreventiveMatrixQuarterCell = {
    doneAt: Date;
    bmsName: string;
    bmsNIK: string;
    totalReal: number | null;
};

export type PreventiveMatrixExportRow = {
    storeCode: string;
    storeName: string;
    branchName: string;
    q1: PreventiveMatrixQuarterCell | null;
    q2: PreventiveMatrixQuarterCell | null;
    q3: PreventiveMatrixQuarterCell | null;
    q4: PreventiveMatrixQuarterCell | null;
};

export type PreventiveMatrixBranchSummary = {
    branchName: string;
    totalStores: number;
    completed: number;
    pending: number;
    coverage: number;
    q1Total: number;
    q2Total: number;
    q3Total: number;
    q4Total: number;
    yearTotal: number;
};

export type PreventiveMatrixExportData = {
    rows: PreventiveMatrixExportRow[];
    branchSummaries: PreventiveMatrixBranchSummary[];
    grandTotal: PreventiveMatrixBranchSummary;
};

type PreventiveMatrixRawReport = {
    reportNumber: string;
    storeCode: string | null;
    createdAt: Date;
    createdByNIK: string;
    createdByName: string | null;
    totalReal: number | string | Prisma.Decimal | null;
};

type PreventiveMatrixShapeReport = Omit<PreventiveMatrixRawReport, "totalReal"> & {
    totalReal: number | null;
};

const QUARTER_KEYS: PreventiveMatrixExportQuarterKey[] = [
    "q1",
    "q2",
    "q3",
    "q4",
];

function calculateCoverage(completed: number, total: number) {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function addAmount(value: number | null) {
    return value === null ? 0 : value;
}

function toNumberOrNull(value: PreventiveMatrixRawReport["totalReal"]) {
    if (value === null) return null;
    return Number(value);
}

function emptyGrandTotal(): PreventiveMatrixBranchSummary {
    return {
        branchName: "GRAND TOTAL",
        totalStores: 0,
        completed: 0,
        pending: 0,
        coverage: 0,
        q1Total: 0,
        q2Total: 0,
        q3Total: 0,
        q4Total: 0,
        yearTotal: 0,
    };
}

export function getPreventiveMatrixQuarterKey(
    quarter: PreventiveMatrixExportQuarter,
): PreventiveMatrixExportQuarterKey {
    return `q${quarter}` as PreventiveMatrixExportQuarterKey;
}

function buildBranchSummaries(
    rows: PreventiveMatrixExportRow[],
    selectedQuarterKey: PreventiveMatrixExportQuarterKey,
): PreventiveMatrixBranchSummary[] {
    const summaries = new Map<string, PreventiveMatrixBranchSummary>();

    for (const row of rows) {
        const summary = summaries.get(row.branchName) ?? {
            branchName: row.branchName,
            totalStores: 0,
            completed: 0,
            pending: 0,
            coverage: 0,
            q1Total: 0,
            q2Total: 0,
            q3Total: 0,
            q4Total: 0,
            yearTotal: 0,
        };

        const q1Total = addAmount(row.q1?.totalReal ?? null);
        const q2Total = addAmount(row.q2?.totalReal ?? null);
        const q3Total = addAmount(row.q3?.totalReal ?? null);
        const q4Total = addAmount(row.q4?.totalReal ?? null);

        summary.totalStores += 1;
        if (row[selectedQuarterKey]) summary.completed += 1;
        else summary.pending += 1;
        summary.q1Total += q1Total;
        summary.q2Total += q2Total;
        summary.q3Total += q3Total;
        summary.q4Total += q4Total;
        summary.yearTotal += q1Total + q2Total + q3Total + q4Total;
        summary.coverage = calculateCoverage(summary.completed, summary.totalStores);
        summaries.set(row.branchName, summary);
    }

    return Array.from(summaries.values()).sort((a, b) =>
        a.branchName.localeCompare(b.branchName, "id-ID"),
    );
}

function buildGrandTotal(
    branchSummaries: PreventiveMatrixBranchSummary[],
): PreventiveMatrixBranchSummary {
    const grandTotal = emptyGrandTotal();

    for (const summary of branchSummaries) {
        grandTotal.totalStores += summary.totalStores;
        grandTotal.completed += summary.completed;
        grandTotal.pending += summary.pending;
        grandTotal.q1Total += summary.q1Total;
        grandTotal.q2Total += summary.q2Total;
        grandTotal.q3Total += summary.q3Total;
        grandTotal.q4Total += summary.q4Total;
        grandTotal.yearTotal += summary.yearTotal;
    }

    grandTotal.coverage = calculateCoverage(
        grandTotal.completed,
        grandTotal.totalStores,
    );

    return grandTotal;
}

export function shapePreventiveMatrixExportData(input: {
    stores: Array<{ code: string; name: string; branchName: string }>;
    reports: PreventiveMatrixShapeReport[];
    selectedQuarter: PreventiveMatrixExportQuarter;
    status: PreventiveMatrixExportStatus;
}): PreventiveMatrixExportData {
    const storeMap = new Map(input.stores.map((store) => [store.code, store]));
    const infoByStore = new Map<
        string,
        Record<PreventiveMatrixExportQuarterKey, PreventiveMatrixQuarterCell | null>
    >();

    for (const report of input.reports) {
        if (!report.storeCode || !storeMap.has(report.storeCode)) continue;

        const quarterKey = getJakartaQuarterKey(
            report.createdAt,
        ) as PreventiveMatrixExportQuarterKey;
        const quarterInfo = infoByStore.get(report.storeCode) ?? {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
        };
        const existing = quarterInfo[quarterKey];

        if (!existing || report.createdAt > existing.doneAt) {
            quarterInfo[quarterKey] = {
                doneAt: report.createdAt,
                bmsName: report.createdByName ?? "",
                bmsNIK: report.createdByNIK ?? "",
                totalReal: report.totalReal,
            };
            infoByStore.set(report.storeCode, quarterInfo);
        }
    }

    const allRows = input.stores.map((store) => {
        const quarterInfo = infoByStore.get(store.code) ?? {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
        };

        return {
            storeCode: store.code,
            storeName: store.name,
            branchName: store.branchName,
            q1: quarterInfo.q1,
            q2: quarterInfo.q2,
            q3: quarterInfo.q3,
            q4: quarterInfo.q4,
        };
    });

    const selectedQuarterKey = getPreventiveMatrixQuarterKey(
        input.selectedQuarter,
    );
    const rows = allRows.filter((row) => {
        if (input.status === "all") return true;
        const done = row[selectedQuarterKey] !== null;
        return input.status === "completed" ? done : !done;
    });

    const branchSummaries = buildBranchSummaries(rows, selectedQuarterKey);

    return {
        rows,
        branchSummaries,
        grandTotal: buildGrandTotal(branchSummaries),
    };
}

function getStoreBranchScope(input: {
    role: string;
    branchNames: string[];
    excludedBranchName: string;
}) {
    const { role, branchNames, excludedBranchName } = input;
    if (role === "ADMIN") {
        return { NOT: { branchName: excludedBranchName } };
    }

    return { branchName: { in: branchNames } };
}

export async function getPreventiveMatrixExportData(
    filters: PreventiveMatrixExportFilters,
): Promise<PreventiveMatrixExportData> {
    const [{ default: prisma }, { Prisma }, { getAuthUser }, { logger }, adminBranchScope, reportPreventiveSql, storeBrandFilter] =
        await Promise.all([
            import("@/lib/prisma"),
            import("@prisma/client"),
            import("@/lib/authorization"),
            import("@/lib/logger"),
            import("@/lib/admin-branch-scope"),
            import("@/lib/report-preventive-sql"),
            import("@/lib/store-brand-filter"),
        ]);
    const { EXCLUDED_ADMIN_BRANCH_NAME } = adminBranchScope;
    const { completePreventiveEvidenceSql } = reportPreventiveSql;
    const { getStoreBrandWhere, parseStoreBrandFilter } = storeBrandFilter;

    try {
        const user = await getAuthUser();
        if (
            !user ||
            (user.role !== "ADMIN" &&
                user.role !== "BMC" &&
                user.role !== "BNM_MANAGER")
        ) {
            throw new Error("Unauthorized");
        }

        const brand = parseStoreBrandFilter(filters.brand);
        if (brand === null) throw new Error("Invalid brand filter");

        const where: Prisma.StoreWhereInput = {
            ...getStoreBranchScope({
                role: user.role,
                branchNames: user.branchNames,
                excludedBranchName: EXCLUDED_ADMIN_BRANCH_NAME,
            }),
        };

        if (filters.branchName && filters.branchName !== "all") {
            if (user.role !== "ADMIN" && !user.branchNames.includes(filters.branchName)) {
                throw new Error("Unauthorized branch access");
            }
            where.branchName = filters.branchName;
        }

        if (brand !== "ALL") {
            const brandWhere = getStoreBrandWhere(brand);
            if (brandWhere) {
                if (Array.isArray(where.AND)) {
                    where.AND.push(brandWhere);
                } else if (where.AND) {
                    where.AND = [where.AND, brandWhere];
                } else {
                    where.AND = [brandWhere];
                }
            }
        }

        const stores = await prisma.store.findMany({
            where,
            orderBy: { code: "asc" },
            select: {
                code: true,
                name: true,
                branchName: true,
            },
        });

        if (stores.length === 0) {
            return shapePreventiveMatrixExportData({
                stores,
                reports: [],
                selectedQuarter: filters.quarter,
                status: filters.status,
            });
        }

        const storeCodes = stores.map((store) => store.code);
        const { start, endExclusive } = getJakartaYearWindow(filters.year);
        const reportPredicates: Prisma.Sql[] = [
            completePreventiveEvidenceSql({
                statusColumn: Prisma.sql`r."status"`,
                itemsColumn: Prisma.sql`r."items"`,
            }),
            Prisma.sql`r."createdAt" >= ${start}`,
            Prisma.sql`r."createdAt" < ${endExclusive}`,
            Prisma.sql`r."storeCode" IN (${Prisma.join(storeCodes)})`,
        ];

        if (filters.branchName && filters.branchName !== "all") {
            reportPredicates.push(
                Prisma.sql`r."branchName" = ${filters.branchName}`,
            );
        } else if (user.role === "ADMIN") {
            reportPredicates.push(
                Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`,
            );
        } else if (user.branchNames.length > 0) {
            reportPredicates.push(
                Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`,
            );
        } else {
            reportPredicates.push(Prisma.sql`FALSE`);
        }

        const reports = await prisma.$queryRaw<PreventiveMatrixRawReport[]>`
            SELECT
                r."reportNumber",
                r."storeCode",
                r."createdAt",
                r."createdByNIK",
                u."name" AS "createdByName",
                r."totalReal"
            FROM "Report" r
            LEFT JOIN "User" u ON u."NIK" = r."createdByNIK"
            WHERE ${Prisma.join(reportPredicates, " AND ")}
            ORDER BY r."createdAt" DESC
        `;

        return shapePreventiveMatrixExportData({
            stores,
            reports: reports.map((report) => ({
                ...report,
                totalReal: toNumberOrNull(report.totalReal),
            })),
            selectedQuarter: filters.quarter,
            status: filters.status,
        });
    } catch (error) {
        logger.error(
            {
                operation: "getPreventiveMatrixExportData",
                filters: JSON.stringify(filters),
            },
            "Failed to build preventive matrix export data",
            error,
        );
        throw error;
    }
}
