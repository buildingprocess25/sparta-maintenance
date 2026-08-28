export type PjumApprovalReport = {
    reportNumber: string;
    status: string;
    finishedAt: Date | null;
    requiresPjum: boolean;
    pjumExportedAt: Date | null;
    pjumHangingAt: Date | null;
    pjumExpiredAt: Date | null;
};

export type PjumApprovalClassification = {
    carryReportNumbers: string[];
    expireReportNumbers: string[];
};

export function isActivePjumHangingReport(report: {
    pjumHangingAt: Date | null;
    pjumExpiredAt: Date | null;
    pjumExportedAt: Date | null;
}): boolean {
    return Boolean(
        report.pjumHangingAt &&
            !report.pjumExpiredAt &&
            !report.pjumExportedAt,
    );
}

export function getPjumHangingExpirySummary(
    reports: Array<{ reportNumber: string; realizedAmount: number }>,
) {
    return {
        count: reports.length,
        totalRealization: reports.reduce(
            (sum, report) => sum + report.realizedAmount,
            0,
        ),
        reportNumbers: reports.map((report) => report.reportNumber),
    };
}

export function classifyPjumApprovalReports(input: {
    reports: PjumApprovalReport[];
    approvedReportNumbers: string[];
    fromDate: Date;
    toEndExclusive: Date;
}): PjumApprovalClassification {
    const approved = new Set(input.approvedReportNumbers);
    const carryReportNumbers: string[] = [];
    const expireReportNumbers: string[] = [];

    for (const report of input.reports) {
        if (
            report.pjumHangingAt &&
            !report.pjumExpiredAt &&
            !approved.has(report.reportNumber)
        ) {
            expireReportNumbers.push(report.reportNumber);
            continue;
        }

        const isNewOmission =
            !report.pjumHangingAt &&
            !report.pjumExpiredAt &&
            !report.pjumExportedAt &&
            !approved.has(report.reportNumber) &&
            report.status === "COMPLETED" &&
            report.requiresPjum &&
            report.finishedAt !== null &&
            report.finishedAt >= input.fromDate &&
            report.finishedAt < input.toEndExclusive;

        if (isNewOmission) {
            carryReportNumbers.push(report.reportNumber);
        }
    }

    return { carryReportNumbers, expireReportNumbers };
}
