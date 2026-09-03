export const PJUM_SELECTION_LIMIT = 1_000_000;

export type PjumSelectionPolicyReport = {
    reportNumber: string;
    totalRealisasi: number;
    isHangingReport: boolean;
    isValid: boolean;
};

export function evaluatePjumSelectionPolicy(input: {
    rows: PjumSelectionPolicyReport[];
    selectedReportNumbers: string[];
    limit?: number;
}) {
    const limit = input.limit ?? PJUM_SELECTION_LIMIT;
    const selected = new Set(input.selectedReportNumbers);
    const validRows = input.rows.filter((row) => row.isValid);
    const mandatoryHangingReportNumbers = validRows
        .filter((row) => row.isHangingReport)
        .map((row) => row.reportNumber);
    const missingMandatoryHangingReportNumbers =
        mandatoryHangingReportNumbers.filter(
            (reportNumber) => !selected.has(reportNumber),
        );
    const selectedTotal = validRows.reduce(
        (sum, row) =>
            selected.has(row.reportNumber) ? sum + row.totalRealisasi : sum,
        0,
    );

    return {
        mandatoryHangingReportNumbers,
        missingMandatoryHangingReportNumbers,
        selectedTotal,
        selectedCount: validRows.filter((row) =>
            selected.has(row.reportNumber),
        ).length,
        exceedsLimit: selectedTotal > limit,
        limit,
    };
}
