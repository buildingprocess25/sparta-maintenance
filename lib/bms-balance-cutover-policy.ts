import type { ReportStatus } from "@prisma/client";

import { resolveReportTotalRealisasi } from "@/lib/realisasi";

export const BMS_INITIAL_HANGING_REPORT_CUTOVER = new Date(
    "2026-06-18T00:00:00.000+07:00",
);

export const BMS_ACTIVE_REPORT_BLOCKER_CUTOVER = new Date(
    "2026-09-11T00:00:00.000+07:00",
);

export const BMS_BALANCE_CUTOVER_REFERENCE_DATE = new Date(
    "2026-09-18T00:00:00.000+07:00",
);

export type InitialHangingReportCandidateInput = {
    status: ReportStatus | string;
    finishedAt: Date | null;
    pjumExportedAt: Date | null;
    pjumHangingAt: Date | null;
    pjumExpiredAt: Date | null;
    totalReal: unknown;
    items?: unknown;
};

export function isInitialHangingReportCandidate(
    report: InitialHangingReportCandidateInput,
    cutoff: Date = BMS_INITIAL_HANGING_REPORT_CUTOVER,
) {
    return (
        report.status === "COMPLETED" &&
        report.finishedAt !== null &&
        report.finishedAt >= cutoff &&
        report.pjumExportedAt === null &&
        report.pjumHangingAt === null &&
        report.pjumExpiredAt === null &&
        resolveReportTotalRealisasi(report.totalReal, report.items) > 0
    );
}
