import "server-only";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RealisasiPeriod = "ytd" | "30d" | "90d" | "12m";

/**
 * Parsed period result used internally by the query.
 * - { mode: "preset" } → uses existing rolling-window logic
 * - { mode: "month", month, year } → filters a specific calendar month
 */
type ParsedPeriod =
    | { mode: "preset"; period: RealisasiPeriod }
    | { mode: "month"; month: number; year: number };

/**
 * Parse a raw period string from the URL.
 * Accepts: "ytd" | "30d" | "90d" | "12m" | "MM-YYYY"
 */
function parsePeriodParam(raw: string): ParsedPeriod {
    if (
        raw === "ytd" ||
        raw === "30d" ||
        raw === "90d" ||
        raw === "12m"
    ) {
        return { mode: "preset", period: raw as RealisasiPeriod };
    }
    // Try MM-YYYY
    const match = /^(\d{2})-(\d{4})$/.exec(raw);
    if (match) {
        const month = parseInt(match[1], 10);
        const year = parseInt(match[2], 10);
        if (month >= 1 && month <= 12 && year >= 2000) {
            return { mode: "month", month, year };
        }
    }
    return { mode: "preset", period: "ytd" };
}

export type RealisasiKpi = {
    totalRealisasi: number;
    totalEstimasi: number;
    avgPerReport: number;
    efficiencyPercent: number;
    completedCount: number;
};

export type RealisasiMonthDatum = {
    yearMonth: string;
    label: string;
    totalRealisasi: number;
    count: number;
    avgPerReport: number;
};

export type RealisasiBranchDatum = {
    branchName: string;
    completedCount: number;
    totalEstimasi: number;
    totalRealisasi: number;
    selisih: number;
    efficiencyPercent: number;
    avgRealisasi: number;
};

export type RealisasiPageData = {
    kpi: RealisasiKpi;
    monthly: RealisasiMonthDatum[];
    branches: RealisasiBranchDatum[];
};

// ─── Period helpers ───────────────────────────────────────────────────────────

const MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function getYtdStart(): Date {
    const d = new Date();
    d.setMonth(0);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getPeriodStart(period: RealisasiPeriod): Date {
    if (period === "ytd") return getYtdStart();

    const d = new Date();
    d.setHours(0, 0, 0, 0);

    if (period === "30d") {
        d.setDate(d.getDate() - 30);
        return d;
    }
    if (period === "90d") {
        d.setDate(d.getDate() - 90);
        return d;
    }
    // 12m
    d.setMonth(d.getMonth() - 12);
    d.setDate(1);
    return d;
}

function buildMonthBuckets(start: Date, end: Date = new Date()): { key: string; label: string }[] {
    const buckets: { key: string; label: string }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);

    while (cursor <= end) {
        const m = cursor.getMonth();
        const y = cursor.getFullYear();
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;
        buckets.push({ key, label: `${MONTH_LABELS[m]} ${y}` });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getRealisasiPageData(
    periodRaw: string = "ytd",
    branchFilter?: string,
): Promise<RealisasiPageData> {
    const empty: RealisasiPageData = {
        kpi: {
            totalRealisasi: 0,
            totalEstimasi: 0,
            avgPerReport: 0,
            efficiencyPercent: 0,
            completedCount: 0,
        },
        monthly: [],
        branches: [],
    };

    try {
        const parsed = parsePeriodParam(periodRaw);

        // Build date range based on parsed period
        let start: Date;
        let end: Date | undefined;
        let bucketEnd = new Date();

        if (parsed.mode === "month") {
            start = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0);
            end = new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0); // exclusive
        } else {
            start = getPeriodStart(parsed.period);
            if (parsed.period === "ytd") {
                // For YTD, show all 12 months of the year in the chart
                bucketEnd = new Date(start.getFullYear(), 11, 31);
            }
        }

        // Base where clause — COMPLETED and PJUM-exported with finishedAt in period
        const baseWhere = {
            NOT: { branchName: EXCLUDED_ADMIN_BRANCH_NAME },
            status: "COMPLETED" as const,
            pjumExportedAt: { not: null },
            finishedAt: end
                ? { gte: start, lt: end }
                : { gte: start },
            ...(branchFilter && branchFilter !== "all"
                ? { branchName: branchFilter }
                : {}),
        };

        // Fetch all completed reports with both estimasi and realisasi
        const rows = await prisma.report.findMany({
            where: baseWhere,
            select: {
                branchName: true,
                totalEstimation: true,
                totalReal: true,
                finishedAt: true,
            },
        });

        if (rows.length === 0) {
            return {
                ...empty,
                monthly: buildMonthBuckets(start, bucketEnd).map((b) => ({
                    yearMonth: b.key,
                    label: b.label,
                    totalRealisasi: 0,
                    count: 0,
                    avgPerReport: 0,
                })),
            };
        }

        // ── Accumulate KPI ────────────────────────────────────────────────
        let sumRealisasi = 0;
        let sumEstimasi = 0;

        // ── Accumulate per month ──────────────────────────────────────────
        const monthAcc = new Map<string, { total: number; count: number }>();

        // ── Accumulate per branch ─────────────────────────────────────────
        const branchAcc = new Map<
            string,
            { count: number; totalEst: number; totalReal: number }
        >();

        for (const row of rows) {
            const real = Number(row.totalReal ?? 0);
            const est = Number(row.totalEstimation ?? 0);

            sumRealisasi += real;
            sumEstimasi += est;

            // Month aggregation
            if (row.finishedAt) {
                const mk = monthKey(row.finishedAt);
                const cur = monthAcc.get(mk);
                if (cur) {
                    cur.total += real;
                    cur.count += 1;
                } else {
                    monthAcc.set(mk, { total: real, count: 1 });
                }
            }

            // Branch aggregation
            const brCur = branchAcc.get(row.branchName);
            if (brCur) {
                brCur.count += 1;
                brCur.totalEst += est;
                brCur.totalReal += real;
            } else {
                branchAcc.set(row.branchName, {
                    count: 1,
                    totalEst: est,
                    totalReal: real,
                });
            }
        }

        // ── Build KPI ─────────────────────────────────────────────────────
        const completedCount = rows.length;
        const avgPerReport =
            completedCount > 0 ? Math.round(sumRealisasi / completedCount) : 0;
        const efficiencyPercent =
            sumEstimasi > 0
                ? Math.round(
                      ((sumEstimasi - sumRealisasi) / sumEstimasi) * 100,
                  )
                : 0;

        const kpi: RealisasiKpi = {
            totalRealisasi: sumRealisasi,
            totalEstimasi: sumEstimasi,
            avgPerReport,
            efficiencyPercent,
            completedCount,
        };

        // ── Build monthly trend ───────────────────────────────────────────
        const buckets = buildMonthBuckets(start, bucketEnd);
        const monthly: RealisasiMonthDatum[] = buckets.map((b) => {
            const acc = monthAcc.get(b.key);
            return {
                yearMonth: b.key,
                label: b.label,
                totalRealisasi: acc?.total ?? 0,
                count: acc?.count ?? 0,
                avgPerReport:
                    acc && acc.count > 0
                        ? Math.round(acc.total / acc.count)
                        : 0,
            };
        });

        // ── Build branch comparison ───────────────────────────────────────
        const branches: RealisasiBranchDatum[] = Array.from(
            branchAcc.entries(),
        )
            .map(([branchName, acc]) => {
                const selisih = acc.totalEst - acc.totalReal;
                const efficiency =
                    acc.totalEst > 0
                        ? Math.round((selisih / acc.totalEst) * 100)
                        : 0;
                return {
                    branchName,
                    completedCount: acc.count,
                    totalEstimasi: acc.totalEst,
                    totalRealisasi: acc.totalReal,
                    selisih,
                    efficiencyPercent: efficiency,
                    avgRealisasi:
                        acc.count > 0
                            ? Math.round(acc.totalReal / acc.count)
                            : 0,
                };
            })
            .sort((a, b) => b.totalRealisasi - a.totalRealisasi);

        return { kpi, monthly, branches };
    } catch (error) {
        logger.error(
            { operation: "getRealisasiPageData", period: periodRaw, branchFilter },
            "Failed to fetch realisasi page data",
            error,
        );
        return empty;
    }
}
