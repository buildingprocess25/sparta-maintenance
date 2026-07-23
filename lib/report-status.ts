export const REPORT_STATUS_LABELS = {
    DRAFT: "Draft",
    PENDING_ESTIMATION: "Review Estimasi",
    ESTIMATION_APPROVED: "Siap Dikerjakan",
    ESTIMATION_REJECTED_REVISION: "Revisi Estimasi",
    ESTIMATION_REJECTED: "Estimasi Ditolak",
    IN_PROGRESS: "Dikerjakan",
    PENDING_REVIEW: "Review BMC",
    APPROVED_BMC: "Review BNM",
    REVIEW_REJECTED_REVISION: "Revisi Pekerjaan",
    COMPLETED: "Selesai",
} as const;

export type ReportStatusKey = keyof typeof REPORT_STATUS_LABELS;

export const ARCHIVED_PREVENTIVE_STATUS = "ARCHIVED_PREVENTIVE" as const;
export const OPERATIONAL_EXCLUDED_REPORT_STATUSES = [
    "DRAFT",
    ARCHIVED_PREVENTIVE_STATUS,
] as const;

export const REPORT_STATUS_ORDER: ReportStatusKey[] = [
    "PENDING_ESTIMATION",
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "ESTIMATION_REJECTED_REVISION",
    "REVIEW_REJECTED_REVISION",
    "ESTIMATION_REJECTED",
    "COMPLETED",
];

export const REPORT_STATUS_OPTIONS = REPORT_STATUS_ORDER.map((status) => ({
    value: status,
    label: REPORT_STATUS_LABELS[status],
}));

export const REPORT_STATUS_BADGE_CLASS: Record<ReportStatusKey, string> = {
    DRAFT: "bg-slate-100 text-slate-700 hover:bg-slate-100/80",
    PENDING_ESTIMATION: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
    ESTIMATION_APPROVED: "bg-green-100 text-green-800 hover:bg-green-100/80",
    ESTIMATION_REJECTED_REVISION:
        "bg-orange-100 text-orange-800 hover:bg-orange-100/80",
    ESTIMATION_REJECTED: "bg-red-100 text-red-800 hover:bg-red-100/80",
    IN_PROGRESS: "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
    PENDING_REVIEW: "bg-purple-100 text-purple-800 hover:bg-purple-100/80",
    APPROVED_BMC: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80",
    REVIEW_REJECTED_REVISION:
        "bg-orange-100 text-orange-800 hover:bg-orange-100/80",
    COMPLETED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80",
};

export const REPORT_STATUS_SLUGS: Record<string, ReportStatusKey> = {
    draft: "DRAFT",
    pending_estimation: "PENDING_ESTIMATION",
    estimation_approved: "ESTIMATION_APPROVED",
    estimation_rejected_revision: "ESTIMATION_REJECTED_REVISION",
    estimation_rejected: "ESTIMATION_REJECTED",
    in_progress: "IN_PROGRESS",
    pending_review: "PENDING_REVIEW",
    approved_bmc: "APPROVED_BMC",
    review_rejected_revision: "REVIEW_REJECTED_REVISION",
    completed: "COMPLETED",
};

export function isReportStatusKey(status: string): status is ReportStatusKey {
    return status in REPORT_STATUS_LABELS;
}

export function getReportStatusLabel(status: string): string {
    if (status === ARCHIVED_PREVENTIVE_STATUS) return "Archived Preventive";
    return isReportStatusKey(status) ? REPORT_STATUS_LABELS[status] : status;
}

export function getReportStatusBadgeClass(status: string): string {
    if (status === ARCHIVED_PREVENTIVE_STATUS) {
        return "bg-slate-200 text-slate-800 hover:bg-slate-200/80";
    }
    return isReportStatusKey(status)
        ? REPORT_STATUS_BADGE_CLASS[status]
        : "bg-slate-100 text-slate-700 hover:bg-slate-100/80";
}

export function getReportStatusLabelFromSlug(slug: string): string {
    const status = REPORT_STATUS_SLUGS[slug];
    return status ? REPORT_STATUS_LABELS[status] : slug;
}

export function isRejectedReportStatus(status: string): boolean {
    return (
        status === "ESTIMATION_REJECTED" ||
        status === "ESTIMATION_REJECTED_REVISION" ||
        status === "REVIEW_REJECTED_REVISION"
    );
}

export function isActiveReportStatus(status: string): boolean {
    return (
        isReportStatusKey(status) &&
        status !== "DRAFT" &&
        status !== "ESTIMATION_REJECTED" &&
        status !== "COMPLETED"
    );
}
