export const PJUM_STATUS_LABELS = {
    PENDING_APPROVAL: "Review BNM",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
} as const;

export type PjumStatusKey = keyof typeof PJUM_STATUS_LABELS;

export const PJUM_STATUS_OPTIONS = Object.entries(PJUM_STATUS_LABELS).map(
    ([value, label]) => ({ value, label }),
);

export const PJUM_STATUS_BADGE_CLASS: Record<PjumStatusKey, string> = {
    PENDING_APPROVAL: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    APPROVED: "bg-green-100 text-green-700 hover:bg-green-100",
    REJECTED: "bg-red-100 text-red-700 hover:bg-red-100",
};

export function isPjumStatusKey(status: string): status is PjumStatusKey {
    return status in PJUM_STATUS_LABELS;
}

export function getPjumStatusLabel(status: string): string {
    return isPjumStatusKey(status) ? PJUM_STATUS_LABELS[status] : status;
}

export function getPjumStatusBadgeClass(status: string): string {
    return isPjumStatusKey(status)
        ? PJUM_STATUS_BADGE_CLASS[status]
        : "bg-gray-100 text-gray-700 hover:bg-gray-100";
}
