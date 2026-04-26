/**
 * Shared pure utility functions for report domain logic.
 * No I/O, no framework dependencies — safe to use on both server and client.
 */

import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";

/**
 * Returns true when a report qualifies as "REKANAN zero-cost":
 * - All damaged items (RUSAK / NOT_OK) have handler === "REKANAN"
 * - No estimation rows exist (empty estimations array)
 *
 * Reports matching this condition skip the normal BMS work stages and
 * go directly from PENDING_ESTIMATION → APPROVED_BMC (via BMC approval).
 */
export function isRekananZeroCost(
    items: ReportItemJson[],
    estimations: MaterialEstimationJson[],
): boolean {
    const damagedItems = items.filter(
        (item) =>
            item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK",
    );

    if (damagedItems.length === 0) return false;

    const allRekanan = damagedItems.every((item) => item.handler === "REKANAN");
    const hasNoEstimation =
        !Array.isArray(estimations) || estimations.length === 0;

    return allRekanan && hasNoEstimation;
}
