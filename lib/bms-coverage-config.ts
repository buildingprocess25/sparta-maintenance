export type BmsCoverageMode = "BRANCH_WIDE" | "ASSIGNED_ONLY";

/**
 * Feature flag for BMS Store Coverage:
 * - "BRANCH_WIDE" (Default): BMS can view and submit reports for ALL active stores in their branch.
 * - "ASSIGNED_ONLY" (Legacy): BMS can only view/submit reports for stores explicitly assigned to their NIK (or unassigned stores in branch).
 */
export const BMS_STORE_COVERAGE_MODE: BmsCoverageMode = "BRANCH_WIDE";

export function isBranchWideBmsCoverage(): boolean {
    return BMS_STORE_COVERAGE_MODE === "BRANCH_WIDE";
}
