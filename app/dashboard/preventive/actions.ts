"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import {
    type PreventiveCompletion,
    paginatePreventiveRows,
    splitPreventiveRows,
    summarizePreventiveBranches,
} from "./preventive-dashboard";
import {
    getJakartaCurrentQuarter,
    getJakartaQuarterWindow,
    getJakartaTodayStart,
    getJakartaYear,
    getJakartaYearWindow,
} from "@/lib/time";
import { completePreventiveEvidenceSql } from "@/lib/report-preventive-sql";
import { type StoreBrandFilter, getStoreBrandWhere } from "@/lib/store-brand-filter";

export type PreventiveQuarter = 1 | 2 | 3 | 4;
export type PreventiveQuarterKey = "q1" | "q2" | "q3" | "q4";

export type AdminPreventiveFilters = {
    search?: string;
    branchName?: string;
    year: number;
    quarter?: PreventiveQuarter;
    completion?: PreventiveCompletion;
    brand?: StoreBrandFilter;
};

export type PreventiveQuarterInfo = {
    doneAt: string; // ISO string
    bmsName: string;
    bmsNIK: string;
    reportNumber: string;
    status: string;
    issueCount: number;
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

export type PreventiveBranchSummary = {
    branchName: string;
    totalStores: number;
    completed: number;
    pending: number;
    completionRate: number;
    lastDoneAt: string | null;
};

export type PreventiveHistoryItem = {
    reportNumber: string;
    storeCode: string;
    storeName: string;
    branchName: string;
    doneAt: string;
    bmsName: string;
    bmsNIK: string;
    status: string;
    issueCount: number;
};

export type PreventiveSummary = {
    year: number;
    quarter: PreventiveQuarter;
    quarterLabel: string;
    periodLabel: string;
    totalStores: number;
    completed: number;
    pending: number;
    completionRate: number;
    latestDoneAt: string | null;
    daysRemaining: number | null;
    daysOverdue: number | null;
};

type PreventiveQuarterInfoInternal = {
    doneAt: Date;
    bmsName: string;
    bmsNIK: string;
    reportNumber: string;
    status: string;
    issueCount: number;
};

type PreventiveReportRow = {
    reportNumber: string;
    storeCode: string | null;
    storeName: string;
    branchName: string;
    status: string;
    createdAt: Date;
    createdByNIK: string;
    createdByName: string | null;
    issueCount: number | bigint;
};

export type AdminPreventiveResult = {
    rows: PreventiveRow[];
    branchSummaries: PreventiveBranchSummary[];
    latestReports: PreventiveHistoryItem[];
    summary: PreventiveSummary;
    nextCursor: string | null;
    totalCount: number;
};

const QUARTER_KEYS: PreventiveQuarterKey[] = ["q1", "q2", "q3", "q4"];
const QUARTER_LABELS: Record<PreventiveQuarter, string> = {
    1: "Triwulan 1",
    2: "Triwulan 2",
    3: "Triwulan 3",
    4: "Triwulan 4",
};
const QUARTER_PERIOD_LABELS: Record<PreventiveQuarter, string> = {
    1: "Jan-Mar",
    2: "Apr-Jun",
    3: "Jul-Sep",
    4: "Okt-Des",
};

function getBranchScope(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
    if (user.role === "ADMIN") {
        return { NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME } };
    }

    return { branchName: { in: user.branchNames } };
}

function getCurrentQuarter(): PreventiveQuarter {
    return getJakartaCurrentQuarter();
}

function getQuarterFromDate(date: Date): PreventiveQuarter {
    return getJakartaCurrentQuarter(date);
}

function getQuarterKey(quarter: PreventiveQuarter): PreventiveQuarterKey {
    return QUARTER_KEYS[quarter - 1];
}

function getQuarterWindow(year: number, quarter: PreventiveQuarter) {
    const { start, endExclusive } = getJakartaQuarterWindow(year, quarter);
    const endInclusive = new Date(endExclusive.getTime() - 1);
    return { start, endExclusive, endInclusive };
}

function getQuarterTiming(year: number, quarter: PreventiveQuarter) {
    const { start, endInclusive } = getQuarterWindow(year, quarter);
    const today = getJakartaTodayStart();

    if (today < start) {
        return { daysRemaining: null, daysOverdue: null };
    }

    const oneDay = 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((endInclusive.getTime() - today.getTime()) / oneDay);
    if (remaining >= 0) {
        return { daysRemaining: remaining, daysOverdue: null };
    }

    return { daysRemaining: null, daysOverdue: Math.abs(remaining) };
}

function calculateRate(completed: number, total: number) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
}

function toIso(value: Date | null) {
    return value ? value.toISOString() : null;
}

export async function getAdminPreventive(
    cursor: string | null,
    limit: number = 20,
    filters: AdminPreventiveFilters,
): Promise<AdminPreventiveResult> {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

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

        const where: Prisma.StoreWhereInput = {
            ...getBranchScope(user),
        };

        if (filters.search) {
            where.OR = [
                { code: { contains: filters.search, mode: "insensitive" } },
                { name: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            if (user.role !== "ADMIN" && !user.branchNames.includes(filters.branchName)) {
                throw new Error("Unauthorized branch access");
            }
            where.branchName = filters.branchName;
        }

        if (filters.brand && filters.brand !== "ALL") {
            const brandWhere = getStoreBrandWhere(filters.brand);
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

        const quarter = filters.quarter ?? getCurrentQuarter();
        const quarterKey = getQuarterKey(quarter);

        const allStores = await prisma.store.findMany({
            where,
            orderBy: { code: "asc" },
            select: {
                code: true,
                name: true,
                branchName: true,
            },
        });

        // Fetch reports for these stores in the given year
        const { start: yearStart, endExclusive: yearEnd } =
            getJakartaYearWindow(filters.year);

        const allStoreCodes = allStores.map((s) => s.code);
        const storeMap = new Map(allStores.map((store) => [store.code, store]));
        const reportPredicates: Prisma.Sql[] = [
            completePreventiveEvidenceSql({
                statusColumn: Prisma.sql`r."status"`,
                itemsColumn: Prisma.sql`r."items"`,
            }),
            Prisma.sql`r."createdAt" >= ${yearStart}`,
            Prisma.sql`r."createdAt" < ${yearEnd}`,
        ];

        if (user.role === "ADMIN") {
            if (filters.branchName && filters.branchName !== "all") {
                reportPredicates.push(
                    Prisma.sql`r."branchName" = ${filters.branchName}`,
                );
            } else {
                reportPredicates.push(
                    Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`,
                );
            }
        } else if (user.branchNames.length > 0) {
            reportPredicates.push(
                Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`,
            );
        }

        if (filters.search) {
            reportPredicates.push(
                Prisma.sql`r."storeCode" IN (${Prisma.join(allStoreCodes)})`,
            );
        }

        const reports: PreventiveReportRow[] =
            allStoreCodes.length === 0
                ? []
                : await prisma.$queryRaw`
                      SELECT
                        r."reportNumber",
                        r."storeCode",
                        r."storeName",
                        r."branchName",
                        r."status"::text AS "status",
                        r."createdAt",
                        r."createdByNIK",
                        u."name" AS "createdByName",
                        COALESCE((
                          SELECT count(*)::int
                          FROM jsonb_array_elements(r."items") AS item
                          WHERE item->>'preventiveCondition' = 'NOT_OK'
                        ), 0) AS "issueCount"
                      FROM "Report" r
                      LEFT JOIN "User" u ON u."NIK" = r."createdByNIK"
                      WHERE ${Prisma.join(reportPredicates, " AND ")}
                      ORDER BY r."createdAt" DESC
                  `;

        const quarterInfoByStore = new Map<
            string,
            Record<PreventiveQuarterKey, PreventiveQuarterInfoInternal | null>
        >();
        const latestReports: PreventiveHistoryItem[] = [];
        let latestDoneAt: Date | null = null;

        for (const report of reports) {
            if (!report.storeCode) continue;

            const store = storeMap.get(report.storeCode);
            if (!store) continue;

            const issueCount = Number(report.issueCount);
            const info: PreventiveQuarterInfoInternal = {
                doneAt: report.createdAt,
                bmsName: report.createdByName ?? "",
                bmsNIK: report.createdByNIK ?? "",
                reportNumber: report.reportNumber,
                status: report.status,
                issueCount,
            };
            const reportQuarterKey = getQuarterKey(
                getQuarterFromDate(report.createdAt),
            );
            const quarterInfo =
                quarterInfoByStore.get(report.storeCode) ?? {
                    q1: null,
                    q2: null,
                    q3: null,
                    q4: null,
                };
            const existing = quarterInfo[reportQuarterKey];

            if (!existing || info.doneAt > existing.doneAt) {
                quarterInfo[reportQuarterKey] = info;
                quarterInfoByStore.set(report.storeCode, quarterInfo);
            }

            if (
                reportQuarterKey === quarterKey &&
                (!latestDoneAt || report.createdAt > latestDoneAt)
            ) {
                latestDoneAt = report.createdAt;
            }

            if (reportQuarterKey === quarterKey) {
                latestReports.push({
                    reportNumber: report.reportNumber,
                    storeCode: report.storeCode,
                    storeName: report.storeName || store.name,
                    branchName: report.branchName || store.branchName,
                    doneAt: report.createdAt.toISOString(),
                    bmsName: report.createdByName ?? "",
                    bmsNIK: report.createdByNIK ?? "",
                    status: report.status,
                    issueCount,
                });
            }
        }

        const buildRow = (store: (typeof allStores)[number]): PreventiveRow => {
            const quarterInfo = quarterInfoByStore.get(store.code) ?? {
                q1: null,
                q2: null,
                q3: null,
                q4: null,
            };

            const toClientInfo = (
                info: PreventiveQuarterInfoInternal | null,
            ): PreventiveQuarterInfo | null =>
                info
                    ? {
                          doneAt: info.doneAt.toISOString(),
                          bmsName: info.bmsName,
                          bmsNIK: info.bmsNIK,
                          reportNumber: info.reportNumber,
                          status: info.status,
                          issueCount: info.issueCount,
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
        };

        const allRows = allStores.map(buildRow);
        const { completed: completedRows, pending: pendingRows } = splitPreventiveRows(allRows, quarterKey);
        const rowsForCompletion =
            filters.completion === "pending" ? pendingRows :
            filters.completion === "completed" ? completedRows :
            allRows;
        const { rows, nextCursor } = paginatePreventiveRows(rowsForCompletion, cursor, limit);
        const completed = completedRows.length;

        // Compute lastDoneAt per branch from allRows (preserve existing per-branch lastDoneAt logic)
        const branchLastDoneAtMap = new Map<string, Date | null>();
        for (const row of allRows) {
            const quarterInfo = row[quarterKey];
            if (quarterInfo) {
                const doneAt = new Date((quarterInfo as { doneAt: string }).doneAt);
                const existing = branchLastDoneAtMap.get(row.branchName) ?? null;
                if (!existing || doneAt > existing) {
                    branchLastDoneAtMap.set(row.branchName, doneAt);
                }
            } else if (!branchLastDoneAtMap.has(row.branchName)) {
                branchLastDoneAtMap.set(row.branchName, null);
            }
        }

        const branchSummaries = summarizePreventiveBranches(allRows, quarterKey).map((b) => ({
            ...b,
            completionRate: calculateRate(b.completed, b.totalStores),
            lastDoneAt: toIso(branchLastDoneAtMap.get(b.branchName) ?? null),
        })).sort((a, b) => a.completionRate - b.completionRate);

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "getAdminPreventive",
                correlationId,
                durationMs,
                count: rows.length,
                role: user.role,
            },
            "Fetched preventive successfully",
        );

        const timing = getQuarterTiming(filters.year, quarter);

        return {
            rows,
            branchSummaries,
            latestReports,
            summary: {
                year: filters.year,
                quarter,
                quarterLabel: QUARTER_LABELS[quarter],
                periodLabel: QUARTER_PERIOD_LABELS[quarter],
                totalStores: allRows.length,
                completed,
                pending: pendingRows.length,
                completionRate: calculateRate(completed, allRows.length),
                latestDoneAt: toIso(latestDoneAt),
                ...timing,
            },
            nextCursor,
            totalCount: allRows.length,
        };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminPreventive", correlationId, durationMs },
            "Failed to fetch preventive",
            error,
        );
        throw new Error("Failed to load preventive data");
    }
}

export async function getReportYears() {
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

        const branchPredicate =
            user.role === "ADMIN"
                ? Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`
                : user.branchNames.length > 0
                  ? Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`
                  : Prisma.sql`FALSE`;
        const [range] = await prisma.$queryRaw<
            Array<{
                firstCreatedAt: Date | null;
                lastCreatedAt: Date | null;
            }>
        >`
            SELECT
                MIN(r."createdAt") AS "firstCreatedAt",
                MAX(r."createdAt") AS "lastCreatedAt"
            FROM "Report" r
            WHERE ${completePreventiveEvidenceSql({
                statusColumn: Prisma.sql`r."status"`,
                itemsColumn: Prisma.sql`r."items"`,
            })}
              AND ${branchPredicate}
        `;

        if (!range?.firstCreatedAt || !range.lastCreatedAt) {
            return [getJakartaYear()];
        }

        const startYear = getJakartaYear(range.firstCreatedAt);
        const endYear = getJakartaYear(range.lastCreatedAt);
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
        return [getJakartaYear()];
    }
}

export async function getPreventiveBranchOptions(): Promise<string[]> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }
    const stores = await prisma.store.findMany({
        where: getBranchScope(user),
        select: { branchName: true },
        distinct: ["branchName"],
        orderBy: { branchName: "asc" },
    });
    return stores.map((s) => s.branchName);
}
