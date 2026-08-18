import type { ChecklistItem } from "@/lib/checklist-data";

export const CHECKLIST_ONLY_AFTER_SUBMIT_STEPS = [
  'Status laporan menjadi "Review Checklist".',
  "BMC melakukan review checklist.",
  "Jika disetujui, laporan diteruskan ke BNM untuk persetujuan akhir.",
] as const;

export const BMS_AFTER_SUBMIT_STEPS = [
  'Status laporan menjadi "Menunggu Persetujuan Estimasi".',
  "BMC melakukan review estimasi dan checklist.",
  "Jika disetujui, BMS dapat mulai pekerjaan.",
] as const;

export function getAfterSubmitSteps(
  items: Iterable<Pick<ChecklistItem, "condition" | "handler">>,
): readonly string[] {
  for (const item of items) {
    if (item.condition === "rusak" && item.handler === "BMS") {
      return BMS_AFTER_SUBMIT_STEPS;
    }
  }

  return CHECKLIST_ONLY_AFTER_SUBMIT_STEPS;
}
