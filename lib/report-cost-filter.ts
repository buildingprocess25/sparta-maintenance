import type { Prisma } from "@prisma/client";

/**
 * Filter laporan berdasarkan biaya estimasi.
 * "with_cost" = totalEstimation > 0, "no_cost" = totalEstimation = 0
 * (sama dengan definisi zero-cost di alur mulai pekerjaan).
 */
export type ReportCostFilter = "ALL" | "with_cost" | "no_cost";

export const REPORT_COST_OPTIONS: { value: Exclude<ReportCostFilter, "ALL">; label: string }[] = [
    { value: "with_cost", label: "Ada biaya" },
    { value: "no_cost", label: "Tanpa biaya" },
];

export function parseReportCostFilter(value: unknown): ReportCostFilter | null {
    if (value === undefined || value === null || value === "" || value === "ALL" || value === "all") {
        return "ALL";
    }
    return value === "with_cost" || value === "no_cost" ? value : null;
}

export function normalizeReportCostFilter(value?: string | null): ReportCostFilter {
    return parseReportCostFilter(value) ?? "ALL";
}

export function getReportCostWhere(cost: ReportCostFilter): Prisma.ReportWhereInput | undefined {
    if (cost === "with_cost") return { totalEstimation: { gt: 0 } };
    if (cost === "no_cost") return { totalEstimation: { lte: 0 } };
    return undefined;
}
