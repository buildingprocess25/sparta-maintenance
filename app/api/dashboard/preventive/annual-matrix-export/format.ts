import type { PreventiveMatrixQuarterCell } from "@/app/dashboard/preventive/annual-matrix-export";
import { formatJakartaDate } from "@/lib/time";

export function formatQuarterCellForExport(
    cell: PreventiveMatrixQuarterCell | null,
) {
    if (!cell) return "Belum";

    const bms = cell.bmsName || cell.bmsNIK || "-";
    return `${formatJakartaDate(cell.doneAt.toISOString())} - ${bms}`;
}
