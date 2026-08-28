import assert from "node:assert/strict";
import { summarizeBmsCutoverAudit } from "./bms-cutover-audit";

assert.deepEqual(
    summarizeBmsCutoverAudit({
        activeBmsNiks: ["B1", "B2", "B3"],
        runningPeriods: [
            { bmsNIK: "B1", status: "ACTIVE", pjumExportId: null },
            { bmsNIK: "B2", status: "LOCKED_PJUM", pjumExportId: "PJ1" },
            { bmsNIK: "B2", status: "ACTIVE", pjumExportId: null },
        ],
        pendingPjums: [{ id: "PJ2", bmsNIK: "B3" }],
        unlinkedOpenReportCount: 2,
    }),
    {
        activeBmsCount: 3,
        activePeriodCount: 2,
        lockedPeriodCount: 1,
        bmsWithoutRunningPeriodCount: 1,
        bmsWithMultipleRunningPeriodsCount: 1,
        lockedWithoutMatchingPendingPjumCount: 1,
        pendingPjumWithoutMatchingLockedPeriodCount: 1,
        unlinkedOpenReportCount: 2,
        isSafeToCutover: false,
    },
);

console.log("BMS cutover audit assertions passed");
