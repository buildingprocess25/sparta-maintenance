import {
    compareChecklistItemIds,
    compareChecklistItemsById,
} from "@/lib/checklist-data";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

/**
 * Urutkan item checklist dan estimasi material sesuai urutan katalog
 * (A1 → A22 → B1 → … → I13) agar semua bagian PDF laporan berurutan.
 * Sort stable: material pada item yang sama tetap sesuai urutan input BMS.
 * Tidak memutasi array input.
 */
export function orderReportPdfContent(data: {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
}): { items: ReportItemJson[]; estimations: MaterialEstimationJson[] } {
    return {
        items: [...data.items].sort(compareChecklistItemsById),
        estimations: [...data.estimations].sort((a, b) =>
            compareChecklistItemIds(a.itemId, b.itemId),
        ),
    };
}
