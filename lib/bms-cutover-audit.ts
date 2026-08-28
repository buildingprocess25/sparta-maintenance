export function summarizeBmsCutoverAudit(input: {
    activeBmsNiks: string[];
    runningPeriods: Array<{
        bmsNIK: string;
        status: "ACTIVE" | "LOCKED_PJUM";
        pjumExportId: string | null;
    }>;
    pendingPjums: Array<{ id: string; bmsNIK: string }>;
    unlinkedOpenReportCount: number;
}) {
    const runningCountByBms = new Map<string, number>();
    for (const period of input.runningPeriods) {
        runningCountByBms.set(
            period.bmsNIK,
            (runningCountByBms.get(period.bmsNIK) ?? 0) + 1,
        );
    }

    const pendingKeys = new Set(
        input.pendingPjums.map((pjum) => `${pjum.bmsNIK}:${pjum.id}`),
    );
    const lockedKeys = new Set(
        input.runningPeriods
            .filter(
                (period) =>
                    period.status === "LOCKED_PJUM" && period.pjumExportId,
            )
            .map((period) => `${period.bmsNIK}:${period.pjumExportId}`),
    );

    const summary = {
        activeBmsCount: input.activeBmsNiks.length,
        activePeriodCount: input.runningPeriods.filter(
            (period) => period.status === "ACTIVE",
        ).length,
        lockedPeriodCount: input.runningPeriods.filter(
            (period) => period.status === "LOCKED_PJUM",
        ).length,
        bmsWithoutRunningPeriodCount: input.activeBmsNiks.filter(
            (nik) => !runningCountByBms.has(nik),
        ).length,
        bmsWithMultipleRunningPeriodsCount: [...runningCountByBms.values()].filter(
            (count) => count > 1,
        ).length,
        lockedWithoutMatchingPendingPjumCount: input.runningPeriods.filter(
            (period) =>
                period.status === "LOCKED_PJUM" &&
                (!period.pjumExportId ||
                    !pendingKeys.has(`${period.bmsNIK}:${period.pjumExportId}`)),
        ).length,
        pendingPjumWithoutMatchingLockedPeriodCount: input.pendingPjums.filter(
            (pjum) => !lockedKeys.has(`${pjum.bmsNIK}:${pjum.id}`),
        ).length,
        unlinkedOpenReportCount: input.unlinkedOpenReportCount,
    };

    return {
        ...summary,
        isSafeToCutover: Object.values(summary)
            .slice(3)
            .every((count) => count === 0),
    };
}
