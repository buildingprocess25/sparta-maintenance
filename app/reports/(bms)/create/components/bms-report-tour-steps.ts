import type { Step } from "react-joyride";

export type BmsWizardStep = "store" | "checklist" | "estimation" | "review";

export type BmsReportTourStep = Step & {
    wizardStep: BmsWizardStep;
};

export const BMS_REPORT_TOUR_STEPS: BmsReportTourStep[] = [
    {
        wizardStep: "store",
        target: "[data-tour='bms-report-store']",
        title: "Pilih toko",
        content: "Cari dan pilih toko yang mengalami kerusakan fasilitas.",
        placement: "bottom",
        skipBeacon: true,
    },
    {
        wizardStep: "checklist",
        target: "[data-tour='bms-report-checklist']",
        title: "Checklist & foto bukti",
        content: "Evaluasi setiap item checklist dan lampirkan foto bukti kondisi.",
        placement: "top",
        skipBeacon: true,
    },
    {
        wizardStep: "estimation",
        target: "[data-tour='bms-report-estimation']",
        title: "Estimasi pekerjaan BMS",
        content: "Isi rincian material atau jasa khusus untuk item kerusakan yang ditangani BMS.",
        placement: "top",
        skipBeacon: true,
    },
    {
        wizardStep: "review",
        target: "[data-tour='bms-report-submit']",
        title: "Review & submit",
        content: "Periksa kembali ringkasan laporan sebelum mengirimkan ke BMC.",
        placement: "top",
        skipBeacon: true,
    },
];

export function getBmsReportTourSteps(isEditMode: boolean): BmsReportTourStep[] {
    if (isEditMode) {
        return BMS_REPORT_TOUR_STEPS.filter((step) => step.wizardStep !== "store");
    }
    return BMS_REPORT_TOUR_STEPS;
}
