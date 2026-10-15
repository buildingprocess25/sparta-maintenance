import type { Prisma, ReportStatus } from "@prisma/client";

import { BMS_ACTIVE_REPORT_BLOCKER_CUTOVER } from "@/lib/bms-balance-cutover-policy";
import { formatBnmReviewDeadline } from "@/lib/bnm-review-deadline";
import { getReportStatusLabel } from "@/lib/report-status";

export { BMS_ACTIVE_REPORT_BLOCKER_CUTOVER };

// APPROVED_BMC (Review BNM) sengaja tidak termasuk: BMS boleh membuat laporan
// baru selama BNM belum melewati batas review (lihat lib/bnm-review-deadline.ts).
export const BMS_ACTIVE_REPORT_BLOCKING_STATUSES = [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "REVIEW_REJECTED_REVISION",
] as const satisfies readonly ReportStatus[];

export type BmsActiveReportBlockerKind =
    | "ACTIVE_REPORT"
    | "BNM_REVIEW_OVERDUE";

export type BmsActiveReportBlockerSummary = {
    kind: BmsActiveReportBlockerKind;
    reportNumber: string;
    storeName?: string | null;
    storeCode?: string | null;
    status: ReportStatus | string;
    createdAt?: Date;
    updatedAt?: Date;
    bnmDeadlineAt?: Date | null;
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

export function formatBmsActiveReportBlockerTitle(
    blocker: Partial<Pick<BmsActiveReportBlockerSummary, "kind">>,
) {
    return blocker.kind === "BNM_REVIEW_OVERDUE"
        ? "Laporan baru diblokir"
        : "Laporan aktif belum selesai";
}

export function formatBmsActiveReportBlockerMessage(
    report: Pick<BmsActiveReportBlockerSummary, "reportNumber" | "status"> &
        Partial<Pick<BmsActiveReportBlockerSummary, "kind" | "bnmDeadlineAt">>,
) {
    if (report.kind === "BNM_REVIEW_OVERDUE") {
        const deadline = report.bnmDeadlineAt
            ? ` (${formatBnmReviewDeadline(report.bnmDeadlineAt)})`
            : "";
        return `Laporan ${report.reportNumber} belum disetujui BNM dan melewati batas waktu review${deadline}. Hubungi BNM untuk memprosesnya.`;
    }

    return `Anda bisa membuat laporan baru setelah laporan ${report.reportNumber} disetujui BMC. Status saat ini: ${getReportStatusLabel(report.status)}.`;
}
