"use server";

import { getMyReports } from "./queries";
import type { ReportFilters } from "./types";

export async function getBmsReportsPaginatedAction(filters: ReportFilters) {
    const { reports, total } = await getMyReports(filters);

    // Serialize Prisma Decimal to plain numbers
    const serializedReports = reports.map((r) => ({
        ...r,
        status: r.status as string,
        totalEstimation: Number(r.totalEstimation),
        totalReal: r.totalReal !== null ? Number(r.totalReal) : null,
        totalRealisasi: Number(r.totalRealisasi ?? 0),
    }));

    return {
        reports: serializedReports,
        total,
    };
}
