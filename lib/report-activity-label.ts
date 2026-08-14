const BASE_ACTIVITY_LABELS: Readonly<Record<string, string>> = {
  SUBMITTED: "Laporan diajukan",
  RESUBMITTED_ESTIMATION: "Laporan direvisi & diajukan ulang",
  RESUBMITTED_WORK: "Pekerjaan direvisi & diajukan ulang",
  WORK_STARTED: "Pekerjaan dimulai",
  COMPLETION_SUBMITTED: "Pekerjaan selesai diajukan",
  ESTIMATION_APPROVED: "Estimasi disetujui",
  ESTIMATION_REJECTED_REVISION: "Estimasi ditolak revisi",
  ESTIMATION_REJECTED: "Estimasi ditolak",
  WORK_APPROVED: "Pekerjaan disetujui BMC",
  WORK_REJECTED_REVISION: "Pekerjaan ditolak revisi",
  FINAL_APPROVED_BNM: "Disetujui final BNM",
  FINAL_REJECTED_REVISION_BNM: "Ditolak final BNM revisi",
  ADMIN_REALISASI_REVISED: "Realisasi direvisi admin",
  PJUM_CREATED: "PJUM diajukan",
  PJUM_APPROVED: "PJUM disetujui",
};

const CHECKLIST_ONLY_LABELS: Readonly<Record<string, string>> = {
  ESTIMATION_APPROVED: "Checklist disetujui",
  ESTIMATION_REJECTED_REVISION: "Checklist perlu direvisi",
  ESTIMATION_REJECTED: "Checklist ditolak",
};

export const REVIEW_ACTIVITY_FILTER_OPTIONS = [
  { value: "ESTIMATION_APPROVED", label: "Review disetujui" },
  {
    value: "ESTIMATION_REJECTED_REVISION",
    label: "Review perlu direvisi",
  },
  { value: "ESTIMATION_REJECTED", label: "Review ditolak" },
] as const;

export function getReportActivityActionLabel(
  action: string,
  isChecklistOnly = false,
): string {
  if (isChecklistOnly && CHECKLIST_ONLY_LABELS[action]) {
    return CHECKLIST_ONLY_LABELS[action];
  }

  return BASE_ACTIVITY_LABELS[action] ?? action;
}
