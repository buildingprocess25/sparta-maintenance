export const BRANCH_STUCK_DAYS = 14;

export const BRANCH_OPEN_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

export type BranchPerformanceCompletionInput = {
    status: string;
    pjumExportedAt: Date | null;
};

export function isCompletedForBranchPerformance(
    report: BranchPerformanceCompletionInput,
): boolean {
    return report.status === "COMPLETED" && report.pjumExportedAt !== null;
}

export function calculateBranchCompletionRate(
    completedReports: number,
    totalReports: number,
): number {
    if (totalReports <= 0) return 0;
    return Math.round((completedReports / totalReports) * 100);
}

export function getBranchStuckThresholdDate(now = new Date()): Date {
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - BRANCH_STUCK_DAYS);
    return threshold;
}
