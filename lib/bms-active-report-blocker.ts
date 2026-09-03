import type { Prisma, ReportStatus } from "@prisma/client";

import { getReportStatusLabel } from "@/lib/report-status";

export const BMS_ACTIVE_REPORT_BLOCKER_CUTOVER = new Date(
    "2026-09-03T00:00:00.000+07:00",
);

export const BMS_ACTIVE_REPORT_BLOCKING_STATUSES = [
    "DRAFT",
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const satisfies readonly ReportStatus[];

export type BmsActiveReportBlockerSummary = {
    reportNumber: string;
    storeName?: string | null;
    storeCode?: string | null;
    status: ReportStatus | string;
    createdAt?: Date;
    updatedAt?: Date;
};

export function buildBmsActiveReportBlockerWhere({
    bmsNIK,
    activePeriodId,
    excludeReportNumber,
}: {
    bmsNIK: string;
    activePeriodId: string | null;
    excludeReportNumber?: string;
}): Prisma.ReportWhereInput {
    const periodScope: Prisma.ReportWhereInput[] = [
        {
            balancePeriodId: null,
            createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER },
        },
    ];

    if (activePeriodId) {
        periodScope.unshift({ balancePeriodId: activePeriodId });
    }

    return {
        createdByNIK: bmsNIK,
        ...(excludeReportNumber
            ? { reportNumber: { not: excludeReportNumber } }
            : {}),
        status: { in: [...BMS_ACTIVE_REPORT_BLOCKING_STATUSES] },
        OR: periodScope,
    };
}

export function formatBmsActiveReportBlockerMessage(
    report: Pick<BmsActiveReportBlockerSummary, "reportNumber" | "status">,
) {
    return `Anda bisa membuat laporan baru setelah laporan ${report.reportNumber} berstatus Selesai. Status saat ini: ${getReportStatusLabel(report.status)}.`;
}
