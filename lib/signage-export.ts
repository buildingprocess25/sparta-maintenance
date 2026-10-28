import { getChecklistItemMeta } from "@/lib/checklist-data";
import { SIGNAGE_ITEM_IDS, describeSignageCondition } from "@/lib/signage";
import { getJakartaCurrentQuarter, getJakartaYear } from "@/lib/time";
import type { ReportItemJson } from "@/types/report";

/** Data laporan yang dibutuhkan untuk ekspor signage. */
export type SignageExportReport = {
    reportNumber: string;
    createdAt: Date;
    branchName: string;
    brand: string | null;
    storeCode: string | null;
    storeName: string;
    bmsNIK: string;
    bmsName: string;
    status: string;
    items: unknown;
};

/** Satu baris sheet "Rekap Signage" (satu item signage per laporan). */
export type SignageExportRow = {
    reportNumber: string;
    createdAt: Date;
    /** Kuartal WIB dari `createdAt`, mis. "2026-Q4". */
    quarter: string;
    branchName: string;
    brand: string | null;
    storeCode: string | null;
    storeName: string;
    bmsNIK: string;
    bmsName: string;
    status: string;
    itemId: string;
    itemName: string;
    material: string;
    condition: string;
    notes: string;
    ahoTicketNumber: string;
};

const RECORDED_PREVENTIVE_CONDITIONS = new Set(["OK", "NOT_OK", "TIDAK_ADA"]);

export function formatJakartaQuarterLabel(value: Date | string): string {
    return `${getJakartaYear(value)}-Q${getJakartaCurrentQuarter(value)}`;
}

function getSignageConditionLabel(item: ReportItemJson): string {
    if (item.preventiveCondition === "TIDAK_ADA") return "Tidak Ada";
    return describeSignageCondition(item)?.label ?? "-";
}

function getSignageMaterialLabel(item: ReportItemJson): string {
    if (item.preventiveCondition === "TIDAK_ADA") return "-";
    return item.signageMaterial?.trim() || "-";
}

/** Laporan → baris ekspor signage, urut I11 → I13. */
export function toSignageExportRows(
    report: SignageExportReport,
): SignageExportRow[] {
    const items = Array.isArray(report.items)
        ? (report.items as ReportItemJson[])
        : [];
    const quarter = formatJakartaQuarterLabel(report.createdAt);

    return SIGNAGE_ITEM_IDS.flatMap((itemId) => {
        const item = items.find(
            (candidate) =>
                candidate?.itemId === itemId &&
                RECORDED_PREVENTIVE_CONDITIONS.has(
                    candidate.preventiveCondition ?? "",
                ),
        );
        if (!item) return [];

        return [
            {
                reportNumber: report.reportNumber,
                createdAt: report.createdAt,
                quarter,
                branchName: report.branchName,
                brand: report.brand,
                storeCode: report.storeCode,
                storeName: report.storeName,
                bmsNIK: report.bmsNIK,
                bmsName: report.bmsName,
                status: report.status,
                itemId,
                itemName:
                    getChecklistItemMeta(itemId)?.itemName ??
                    item.itemName ??
                    itemId,
                material: getSignageMaterialLabel(item),
                condition: getSignageConditionLabel(item),
                notes: item.notes?.trim() ?? "",
                ahoTicketNumber: item.ahoTicketNumber?.trim() ?? "",
            },
        ];
    });
}
