import type { Step } from "react-joyride";

export type BmsInputTourId =
    | "condition" | "handler" | "photo" | "notes" | "aho"
    | "add-item" | "estimate-item" | "estimate-name"
    | "estimate-quantity" | "estimate-price" | "estimate-save"
    | "estimate-actions" | "estimate-edit" | "estimate-delete";

export type BmsInputTourStep = Step & {
    id: BmsInputTourId;
    wizardStep: "checklist" | "estimation";
};

export function getBmsInputTourSteps({ activeStep, isRepairOnlyMode }: {
    activeStep: "store" | "checklist" | "estimation" | "review";
    isRepairOnlyMode: boolean;
}): BmsInputTourStep[] {
    if (activeStep === "checklist") {
        const steps: BmsInputTourStep[] = [];

        if (!isRepairOnlyMode) {
            steps.push({
                id: "condition",
                wizardStep: "checklist",
                target: "[data-tour='bms-checklist-condition']",
                title: "Kondisi",
                content: "Pilih kondisi item saat ini.",
                placement: "bottom",
                skipBeacon: true,
            });
        }

        steps.push(
            {
                id: "handler",
                wizardStep: "checklist",
                target: "[data-tour='bms-checklist-handler']",
                title: "Penanganan",
                content: "Tentukan siapa yang akan menangani perbaikan ini, apakah tim internal BMS atau pihak ketiga (Rekanan).",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "photo",
                wizardStep: "checklist",
                target: "[data-tour='bms-checklist-photo']",
                title: "Foto Bukti",
                content: "Lampirkan foto bukti kondisi kerusakan atau perbaikan.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "notes",
                wizardStep: "checklist",
                target: "[data-tour='bms-checklist-notes']",
                title: "Catatan",
                content: "Tambahkan catatan mengenai kerusakan atau tindakan yang diperlukan.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "aho",
                wizardStep: "checklist",
                target: "[data-tour='bms-checklist-aho']",
                title: "Nomor Tiket AHO",
                content: "Masukkan nomor tiket AHO untuk item rusak ini.",
                placement: "bottom",
                skipBeacon: true,
            }
        );
        return steps;
    }

    if (activeStep === "estimation") {
        const estimationSteps: BmsInputTourStep[] = [
            {
                id: "add-item",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-add']",
                title: "Tambah Estimasi",
                content: "Klik untuk menambahkan estimasi material atau jasa.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-item",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-item']",
                title: "Pilih Kategori",
                content: "Pilih kategori item estimasi yang dibutuhkan.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-name",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-name']",
                title: "Nama Material/Jasa",
                content: "Masukkan nama spesifik dari material atau jasa.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-quantity",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-quantity']",
                title: "Kuantitas",
                content: "Masukkan jumlah satuan yang dibutuhkan.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-price",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-price']",
                title: "Harga Satuan",
                content: "Masukkan estimasi harga satuan. Harga Rp 0 diperbolehkan jika tidak ada biaya atau ditanggung pihak lain.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-save",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-save']",
                title: "Simpan Estimasi",
                content: "Simpan rincian estimasi yang telah Anda masukkan.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-actions",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-actions']",
                title: "Opsi Estimasi",
                content: "Buka menu ini untuk melihat opsi tambahan pada estimasi.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-edit",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-edit']",
                title: "Ubah",
                content: "Edit rincian estimasi yang sudah ada.",
                placement: "bottom",
                skipBeacon: true,
            },
            {
                id: "estimate-delete",
                wizardStep: "estimation",
                target: "[data-tour='bms-estimation-delete']",
                title: "Hapus",
                content: "Hapus estimasi jika terjadi kesalahan atau tidak diperlukan.",
                placement: "bottom",
                skipBeacon: true,
            }
        ];

        return estimationSteps.map((step) => ({ ...step, disableOverlay: true }));
    }
    
    return [];
}
