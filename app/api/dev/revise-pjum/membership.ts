export type PjumMembershipReport = {
    reportNumber: string;
    status: string;
    pjumExportedAt: Date | null;
};

export type RevisedPjumMembership = {
    revisedReportNumbers: string[];
    removedReportNumbers: string[];
    addedReportNumbers: string[];
};

export function calculateRevisedPjumMembership(params: {
    existingReportNumbers: string[];
    rangeReports: PjumMembershipReport[];
    removedReportNumbers?: string[];
}): RevisedPjumMembership {
    const existingSet = new Set(params.existingReportNumbers);
    const manuallyRemovedSet = new Set(params.removedReportNumbers ?? []);
    const nonCompletedReport = params.rangeReports.find(
        (report) => report.status !== "COMPLETED",
    );

    if (nonCompletedReport) {
        throw new Error(
            `Masih ada laporan dengan status ${nonCompletedReport.status}. PJUM hanya bisa direvisi jika semua laporan dalam rentang tanggal sudah SELESAI`,
        );
    }

    const exportedElsewhere = params.rangeReports.find(
        (report) =>
            report.pjumExportedAt && !existingSet.has(report.reportNumber),
    );

    if (exportedElsewhere) {
        throw new Error(
            `Laporan ${exportedElsewhere.reportNumber} sudah masuk PJUM lain`,
        );
    }

    const revisedReportNumbers = params.rangeReports
        .map((report) => report.reportNumber)
        .filter((reportNumber) => !manuallyRemovedSet.has(reportNumber));
    const revisedSet = new Set(revisedReportNumbers);

    return {
        revisedReportNumbers,
        removedReportNumbers: params.existingReportNumbers.filter(
            (reportNumber) => !revisedSet.has(reportNumber),
        ),
        addedReportNumbers: revisedReportNumbers.filter(
            (reportNumber) => !existingSet.has(reportNumber),
        ),
    };
}
