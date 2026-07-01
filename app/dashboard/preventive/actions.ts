"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import {
    getAdminBranchHierarchy,
    type AdminBranchHierarchy,
} from "../queries";
import {
    getJakartaCurrentQuarter,
    getJakartaQuarterWindow,
    getJakartaTodayStart,
    getJakartaYear,
    getJakartaYearWindow,
} from "@/lib/time";

export type PreventiveQuarter = 1 | 2 | 3 | 4;
export type PreventiveQuarterKey = "q1" | "q2" | "q3" | "q4";

export type AdminPreventiveFilters = {
    search?: string;
    branchName?: string;
    year: number;
    quarter?: PreventiveQuarter;
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

type PreventiveBranchAccumulator = Omit<
    PreventiveBranchSummary,
    "lastDoneAt"
> & {
    lastDoneAt: Date | null;
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
    pendingRows: PreventiveRow[];
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

function getAdminBranchChildren(
    parentBranch: string,
    hierarchy: AdminBranchHierarchy,
) {
    const branchNames = new Set([parentBranch]);
    for (const [branchName, parent] of hierarchy.parentMap.entries()) {
        if (parent === parentBranch) {
            branchNames.add(branchName);
        }
    }
    branchNames.delete(EXCLUDED_ADMIN_BRANCH_NAME);
    return Array.from(branchNames);
}

function resolveDashboardBranchName(
    branchName: string,
    hierarchy: AdminBranchHierarchy | null,
) {
    return hierarchy?.parentMap.get(branchName) ?? branchName;
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

        const adminHierarchy =
            user.role === "ADMIN" ? await getAdminBranchHierarchy() : null;
        const selectedAdminBranchNames =
            adminHierarchy &&
            filters.branchName &&
            filters.branchName !== "all"
                ? getAdminBranchChildren(filters.branchName, adminHierarchy)
                : null;

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
            where.branchName = selectedAdminBranchNames
                ? { in: selectedAdminBranchNames }
                : filters.branchName;
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

        const cursorIndex = cursor
            ? allStores.findIndex((store) => store.code === cursor)
            : -1;
        const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
        const stores = allStores.slice(startIndex, startIndex + limit);
        const nextCursor =
            startIndex + limit < allStores.length
                ? stores[stores.length - 1]?.code ?? null
                : null;

        // Fetch reports for these stores in the given year
        const { start: yearStart, endExclusive: yearEnd } =
            getJakartaYearWindow(filters.year);

        const allStoreCodes = allStores.map((s) => s.code);
        const storeMap = new Map(allStores.map((store) => [store.code, store]));
        const reportPredicates: Prisma.Sql[] = [
            Prisma.sql`r."status" = 'COMPLETED'::"ReportStatus"`,
            Prisma.sql`r."createdAt" >= ${yearStart}`,
            Prisma.sql`r."createdAt" < ${yearEnd}`,
        ];

        if (user.role === "ADMIN") {
            if (selectedAdminBranchNames) {
                reportPredicates.push(
                    Prisma.sql`r."branchName" IN (${Prisma.join(selectedAdminBranchNames)})`,
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
                        AND EXISTS (
                          SELECT 1
                          FROM jsonb_array_elements(r."items") AS item
                          WHERE item->>'itemId' LIKE 'I%'
                             OR item->>'preventiveCondition' IS NOT NULL
                        )
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
        const rows = stores.map(buildRow);
        const pendingRows = allRows.filter((row) => !row[quarterKey]);
        const completed = allRows.length - pendingRows.length;

        const initialBranchSummaries =
            adminHierarchy && !selectedAdminBranchNames
                ? new Map(
                      adminHierarchy.options.map((option) => [
                          option.name,
                          {
                              branchName: option.name,
                              totalStores: 0,
                              completed: 0,
                              pending: 0,
                              completionRate: 0,
                              lastDoneAt: null as Date | null,
                          },
                      ]),
                  )
                : new Map<string, PreventiveBranchAccumulator>();

        if (adminHierarchy && filters.branchName && filters.branchName !== "all") {
            initialBranchSummaries.set(filters.branchName, {
                branchName: filters.branchName,
                totalStores: 0,
                completed: 0,
                pending: 0,
                completionRate: 0,
                lastDoneAt: null,
            });
        }

        const branchSummaries = Array.from(
            allRows.reduce((map, row) => {
                const dashboardBranchName = resolveDashboardBranchName(
                    row.branchName,
                    adminHierarchy,
                );
                const current = map.get(dashboardBranchName) ?? {
                    branchName: dashboardBranchName,
                    totalStores: 0,
                    completed: 0,
                    pending: 0,
                    completionRate: 0,
                    lastDoneAt: null as Date | null,
                };
                const currentQuarterInfo = row[quarterKey];

                current.totalStores += 1;
                if (currentQuarterInfo) {
                    current.completed += 1;
                    const doneAt = new Date(currentQuarterInfo.doneAt);
                    if (!current.lastDoneAt || doneAt > current.lastDoneAt) {
                        current.lastDoneAt = doneAt;
                    }
                } else {
                    current.pending += 1;
                }

                map.set(dashboardBranchName, current);
                return map;
            }, initialBranchSummaries),
        )
            .map(([, branch]) => ({
                ...branch,
                completionRate: calculateRate(branch.completed, branch.totalStores),
                lastDoneAt: toIso(branch.lastDoneAt),
            }))
            .sort((a, b) => a.completionRate - b.completionRate);

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            {
                operation: "getAdminPreventive",
                correlationId,
                durationMs,
                count: stores.length,
                role: user.role,
            },
            "Fetched preventive successfully",
        );

        const timing = getQuarterTiming(filters.year, quarter);

        return {
            rows,
            pendingRows,
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
        if (!user || (user.role !== "ADMIN" && user.role !== "BMC")) {
            throw new Error("Unauthorized");
        }

        const firstReport = await prisma.report.findFirst({
            where: {
                ...getBranchScope(user),
                status: "COMPLETED",
            },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
        });

        const lastReport = await prisma.report.findFirst({
            where: {
                ...getBranchScope(user),
                status: "COMPLETED",
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });

        if (!firstReport || !lastReport) {
            return [getJakartaYear()];
        }

        const startYear = getJakartaYear(firstReport.createdAt);
        const endYear = getJakartaYear(lastReport.createdAt);
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
