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
    getJakartaMonth,
} from "@/lib/time";
import { completePreventiveEvidenceSql } from "@/lib/report-preventive-sql";
import { type StoreBrandFilter, getStoreBrandWhere, parseStoreBrandFilter } from "@/lib/store-brand-filter";

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

export type PreventiveKpiListItem = {
    label: string;
    completed: number;
    total: number;
    percentage: number;
};

export type PreventiveKpiData = {
    capaianNasional: number;
    tercapai: number;
    belum: number;
    listTitle: string;
    listItems: PreventiveKpiListItem[];
    branchNames: string[];
    allBranchItems: PreventiveKpiListItem[];
};

export type ProcessDurationItem = {
    branchName: string;
    durationSeconds: number;
    formattedDuration: string;
};

export type ProcessDurationData = {
    estimasiToBmc: ProcessDurationItem[];
    bmcToManager: ProcessDurationItem[];
    bmsWork: ProcessDurationItem[];
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
    if (completed === total) return 100;
    const rate = Math.round((completed / total) * 100);
    if (rate === 100 && completed < total) return 99;
    if (rate === 0 && completed > 0) return 1;
    return rate;
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

        const brand = parseStoreBrandFilter(filters.brand);
        if (brand === null) throw new Error("Invalid brand filter");

        const where: Prisma.StoreWhereInput = {
            isActive: true,
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

export type BmsStoreCoverage = {
    storeCode: string;
    storeName: string;
    brand: string | null;
    isCompleted: boolean;
    reportNumber?: string;
    doneAt?: string;
};

export type BmsPreventiveCoverageResult = {
    completed: BmsStoreCoverage[];
    pending: BmsStoreCoverage[];
    total: number;
    completionRate: number;
    quarterLabel: string;
};

export async function getBmsPreventiveCoverage(user: { NIK: string; branchNames: string[] }): Promise<BmsPreventiveCoverageResult> {
    const year = getJakartaYear();
    const quarter = getJakartaCurrentQuarter();
    const quarterLabels: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4" };
    
    if (user.branchNames.length === 0) {
        return { completed: [], pending: [], total: 0, completionRate: 0, quarterLabel: quarterLabels[quarter] + " " + year };
    }

    const { start: yearStart, endExclusive: yearEnd } = getJakartaQuarterWindow(year, quarter);

    const reportPredicates: Prisma.Sql[] = [
        Prisma.sql`r."createdAt" >= ${yearStart}`,
        Prisma.sql`r."createdAt" < ${yearEnd}`,
        completePreventiveEvidenceSql({
            statusColumn: Prisma.sql`r."status"`,
            itemsColumn: Prisma.sql`r."items"`,
        })
    ];

    const rawRows = await prisma.$queryRaw<any[]>`
        WITH QuarterReports AS (
            SELECT 
                r."storeCode",
                r."reportNumber",
                r."createdAt"
            FROM "Report" r
            WHERE ${Prisma.join(reportPredicates, " AND ")}
        ),
        RankedReports AS (
            SELECT 
                "storeCode",
                "reportNumber",
                "createdAt",
                ROW_NUMBER() OVER(PARTITION BY "storeCode" ORDER BY "createdAt" DESC) as rn
            FROM QuarterReports
        )
        SELECT 
            s.code as "storeCode",
            s.name as "storeName",
            s.brand,
            rr."reportNumber",
            rr."createdAt" as "doneAt"
        FROM "Store" s
        LEFT JOIN RankedReports rr ON s.code = rr."storeCode" AND rr.rn = 1
        WHERE s."isActive" = true
          AND s."branchName" IN (${Prisma.join(user.branchNames)})
        ORDER BY s.code ASC;
    `;

    const completed: BmsStoreCoverage[] = [];
    const pending: BmsStoreCoverage[] = [];

    for (const row of rawRows) {
        const item: BmsStoreCoverage = {
            storeCode: row.storeCode,
            storeName: row.storeName,
            brand: row.brand,
            isCompleted: !!row.reportNumber,
            reportNumber: row.reportNumber || undefined,
            doneAt: row.doneAt ? row.doneAt.toISOString() : undefined,
        };

        if (item.isCompleted) {
            completed.push(item);
        } else {
            pending.push(item);
        }
    }

    const total = completed.length + pending.length;
    const completionRate = calculateRate(completed.length, total);

    return {
        completed,
        pending,
        total,
        completionRate,
        quarterLabel: quarterLabels[quarter] + " " + year
    };
}

export async function getAdminPreventiveKpiData(
    year: number,
    quarter: PreventiveQuarter | "all",
    branchName?: string,
): Promise<PreventiveKpiData> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }

    const where: Prisma.StoreWhereInput = {
        isActive: true,
        ...getBranchScope(user),
    };

    if (branchName && branchName !== "all") {
        if (user.role !== "ADMIN" && !user.branchNames.includes(branchName)) {
            throw new Error("Unauthorized");
        }
        where.branchName = branchName;
    }

    const allStores = await prisma.store.findMany({
        where,
        select: { code: true, branchName: true },
    });

    const storeCodes = allStores.map((s) => s.code);
    
    let qStart: Date, qEnd: Date;
    if (quarter === "all") {
        const win = getJakartaYearWindow(year);
        qStart = win.start;
        qEnd = win.endExclusive;
    } else {
        const win = getJakartaQuarterWindow(year, quarter);
        qStart = win.start;
        qEnd = win.endExclusive;
    }

    const reportPredicates: Prisma.Sql[] = [
        completePreventiveEvidenceSql({
            statusColumn: Prisma.sql`r."status"`,
            itemsColumn: Prisma.sql`r."items"`,
        }),
        Prisma.sql`r."createdAt" >= ${qStart}`,
        Prisma.sql`r."createdAt" < ${qEnd}`,
    ];

    if (user.role === "ADMIN") {
        if (branchName && branchName !== "all") {
            reportPredicates.push(Prisma.sql`r."branchName" = ${branchName}`);
        } else {
            reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
        }
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    const reports = storeCodes.length === 0 ? [] : await prisma.$queryRaw<{ storeCode: string, createdAt: Date }[]>`
        SELECT r."storeCode", r."createdAt"
        FROM "Report" r
        WHERE ${Prisma.join(reportPredicates, " AND ")}
          AND r."storeCode" IN (${Prisma.join(storeCodes)})
    `;

    // Deduplicate: a store might have multiple complete reports. Take the earliest one.
    const completedStores = new Map<string, Date>();
    for (const r of reports) {
        const existing = completedStores.get(r.storeCode);
        if (!existing || r.createdAt < existing) {
            completedStores.set(r.storeCode, r.createdAt);
        }
    }
    
    const totalCompleted = completedStores.size;
    const totalStoresCount = allStores.length;
    const capaianNasional = calculateRate(totalCompleted, totalStoresCount);
    
    let listTitle = "";
    let listItems: PreventiveKpiListItem[] = [];
    let allBranchItemsForReturn: PreventiveKpiListItem[] = [];
    
    if (!branchName || branchName === "all") {
        listTitle = "5 Cabang Preventif Terendah";
        const groupMap = new Map<string, { total: number; completed: number }>();
        for (const store of allStores) {
            const current = groupMap.get(store.branchName) || { total: 0, completed: 0 };
            current.total++;
            if (completedStores.has(store.code)) current.completed++;
            groupMap.set(store.branchName, current);
        }
        
        const allBranches = Array.from(groupMap.entries())
            .map(([label, data]) => ({
                label,
                completed: data.completed,
                total: data.total,
                percentage: calculateRate(data.completed, data.total)
            }))
            .sort((a, b) => a.percentage - b.percentage);

        allBranchItemsForReturn = allBranches;
        listItems = allBranches.slice(0, 5);
    } else {
        if (quarter === "all") {
            listTitle = "Tren Penyelesaian per Triwulan";
            const quartersData = [
                { label: "Triwulan 1", completed: 0 },
                { label: "Triwulan 2", completed: 0 },
                { label: "Triwulan 3", completed: 0 },
                { label: "Triwulan 4", completed: 0 },
            ];
            for (const date of completedStores.values()) {
                const q = getJakartaCurrentQuarter(date);
                quartersData[q - 1].completed++;
            }
            listItems = quartersData.map(q => ({
                label: q.label,
                completed: q.completed,
                total: totalStoresCount,
                percentage: calculateRate(q.completed, totalStoresCount)
            }));
        } else {
            listTitle = "Tren Penyelesaian per Bulan";
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const startMonthIdx = (quarter - 1) * 3;
            
            const monthsData = [
                { label: monthNames[startMonthIdx], completed: 0, monthIdx: startMonthIdx + 1 },
                { label: monthNames[startMonthIdx + 1], completed: 0, monthIdx: startMonthIdx + 2 },
                { label: monthNames[startMonthIdx + 2], completed: 0, monthIdx: startMonthIdx + 3 },
            ];
            
            for (const date of completedStores.values()) {
                const m = getJakartaMonth(date); 
                const bucket = monthsData.find(md => md.monthIdx === m);
                if (bucket) bucket.completed++;
            }
            
            listItems = monthsData.map(m => ({
                label: m.label,
                completed: m.completed,
                total: totalStoresCount,
                percentage: calculateRate(m.completed, totalStoresCount)
            }));
        }
    }

    return { 
        capaianNasional, 
        tercapai: totalCompleted, 
        belum: totalStoresCount - totalCompleted, 
        listTitle, 
        listItems,
        branchNames: Array.from(new Set(allStores.map(s => s.branchName))).sort(),
        allBranchItems: allBranchItemsForReturn,
    };
}

function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "-";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}j ${mins}m`;
}

export async function getAdminProcessDurationData(
    year: number,
    quarter: PreventiveQuarter | "all"
): Promise<ProcessDurationData> {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC" && user.role !== "BNM_MANAGER")) {
        throw new Error("Unauthorized");
    }

    let qStart: Date, qEnd: Date;
    if (quarter === "all") {
        const win = getJakartaYearWindow(year);
        qStart = win.start;
        qEnd = win.endExclusive;
    } else {
        const win = getJakartaQuarterWindow(year, quarter);
        qStart = win.start;
        qEnd = win.endExclusive;
    }

    const reportPredicates: Prisma.Sql[] = [
        Prisma.sql`r."createdAt" >= ${qStart}`,
        Prisma.sql`r."createdAt" < ${qEnd}`,
    ];

    if (user.role === "ADMIN") {
        reportPredicates.push(Prisma.sql`r."branchName" <> ${EXCLUDED_ADMIN_BRANCH_NAME}`);
    } else if (user.branchNames.length > 0) {
        reportPredicates.push(Prisma.sql`r."branchName" IN (${Prisma.join(user.branchNames)})`);
    }

    // Raw SQL to compute durations
    const rows = await prisma.$queryRaw<{ 
        branchName: string; 
        avg_estimasi_bmc: number | null; 
        avg_bmc_bnm: number | null; 
        avg_bms_work: number | null; 
    }[]>`
        WITH report_events AS (
            SELECT 
                r."branchName",
                r."reportNumber",
                MAX(a."createdAt") FILTER (WHERE a.action IN ('SUBMITTED', 'RESUBMITTED_ESTIMATION')) AS estimasi_submit_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_APPROVED') AS bmc_estimasi_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_STARTED') AS bms_start_at,
                MAX(a."createdAt") FILTER (WHERE a.action IN ('COMPLETION_SUBMITTED', 'RESUBMITTED_WORK')) AS bms_complete_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_APPROVED') AS bmc_work_approve_at,
                MAX(a."createdAt") FILTER (WHERE a.action = 'FINAL_APPROVED_BNM') AS bnm_approve_at
            FROM "Report" r
            JOIN "ActivityLog" a ON r."reportNumber" = a."reportNumber"
            WHERE ${Prisma.join(reportPredicates, " AND ")}
            GROUP BY r."branchName", r."reportNumber"
        )
        SELECT 
            "branchName",
            AVG(EXTRACT(EPOCH FROM (bmc_estimasi_approve_at - estimasi_submit_at))) AS avg_estimasi_bmc,
            AVG(EXTRACT(EPOCH FROM (bnm_approve_at - bmc_work_approve_at))) AS avg_bmc_bnm,
            AVG(EXTRACT(EPOCH FROM (bms_complete_at - bms_start_at))) AS avg_bms_work
        FROM report_events
        GROUP BY "branchName"
    `;

    // Map and format results
    const estimasiToBmc: ProcessDurationItem[] = [];
    const bmcToManager: ProcessDurationItem[] = [];
    const bmsWork: ProcessDurationItem[] = [];

    for (const row of rows) {
        if (row.avg_estimasi_bmc != null) {
            estimasiToBmc.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_estimasi_bmc),
                formattedDuration: formatDuration(Number(row.avg_estimasi_bmc))
            });
        }
        if (row.avg_bmc_bnm != null) {
            bmcToManager.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_bmc_bnm),
                formattedDuration: formatDuration(Number(row.avg_bmc_bnm))
            });
        }
        if (row.avg_bms_work != null) {
            bmsWork.push({
                branchName: row.branchName,
                durationSeconds: Number(row.avg_bms_work),
                formattedDuration: formatDuration(Number(row.avg_bms_work))
            });
        }
    }

    // Sort descending by duration
    estimasiToBmc.sort((a, b) => b.durationSeconds - a.durationSeconds);
    bmcToManager.sort((a, b) => b.durationSeconds - a.durationSeconds);
    bmsWork.sort((a, b) => b.durationSeconds - a.durationSeconds);

    return {
        estimasiToBmc: estimasiToBmc.slice(0, 5),
        bmcToManager: bmcToManager.slice(0, 5),
        bmsWork: bmsWork.slice(0, 5),
    };
}
