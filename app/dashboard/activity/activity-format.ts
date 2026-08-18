import {
    getReportActivityActionLabel,
    REVIEW_ACTIVITY_FILTER_OPTIONS,
} from "@/lib/report-activity-label";

export const ROLE_OPTIONS = [
    { value: "BMS", label: "BMS" },
    { value: "BMC", label: "BMC" },
    { value: "BNM_MANAGER", label: "BnM Manager" },
    { value: "ADMIN", label: "Admin" },
];

export const MODULE_OPTIONS = [
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "PJUM", label: "PJUM" },
    { value: "REALISASI", label: "Realisasi" },
];

export const ACTION_OPTIONS = [
    { value: "SUBMITTED", label: "Laporan diajukan" },
    {
        value: "RESUBMITTED_ESTIMATION",
        label: "Laporan direvisi & diajukan ulang",
    },
    { value: "RESUBMITTED_WORK", label: "Pekerjaan direvisi & diajukan ulang" },
    { value: "WORK_STARTED", label: "Pekerjaan dimulai" },
    { value: "COMPLETION_SUBMITTED", label: "Pekerjaan selesai diajukan" },
    ...REVIEW_ACTIVITY_FILTER_OPTIONS,
    { value: "WORK_APPROVED", label: "Pekerjaan disetujui BMC" },
    { value: "WORK_REJECTED_REVISION", label: "Pekerjaan ditolak revisi" },
    { value: "FINAL_APPROVED_BNM", label: "Disetujui final BNM" },
    { value: "FINAL_REJECTED_REVISION_BNM", label: "Ditolak final BNM revisi" },
    { value: "ADMIN_REALISASI_REVISED", label: "Realisasi direvisi admin" },
    { value: "PJUM_CREATED", label: "PJUM diajukan" },
    { value: "PJUM_APPROVED", label: "PJUM disetujui" },
];

export function getActivityActionLabel(
    action: string,
    isChecklistOnly = false,
): string {
    return getReportActivityActionLabel(action, isChecklistOnly);
}

export function getActivityModuleLabel(module: string) {
    if (module === "MAINTENANCE") return "Maintenance";
    if (module === "PJUM") return "PJUM";
    if (module === "REALISASI") return "Realisasi";
    return module;
}

export function getModuleBadgeClass(module: string) {
    if (module === "PJUM") return "border-amber-200 bg-amber-50 text-amber-700";
    if (module === "REALISASI") {
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
}

export function getActionBadgeClass(action: string) {
    if (action.includes("REJECTED")) {
        return "border-red-200 bg-red-50 text-red-700";
    }
    if (action.includes("APPROVED")) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (action.includes("REVISION") || action.includes("REVISED")) {
        return "border-orange-200 bg-orange-50 text-orange-700";
    }
    return "border-slate-200 bg-slate-50 text-slate-700";
}
