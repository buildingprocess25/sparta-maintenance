import assert from "node:assert/strict";
import {
    calculateBranchCompletionRate,
    getBranchStuckThresholdDate,
    isCompletedForBranchPerformance,
} from "./admin-branches";

assert.equal(calculateBranchCompletionRate(0, 0), 0);
assert.equal(calculateBranchCompletionRate(1, 4), 25);
assert.equal(calculateBranchCompletionRate(2, 3), 67);

assert.equal(
    isCompletedForBranchPerformance({
        status: "COMPLETED",
        pjumExportedAt: new Date("2026-05-01T00:00:00.000Z"),
    }),
    true,
);
assert.equal(
    isCompletedForBranchPerformance({
        status: "COMPLETED",
        pjumExportedAt: null,
    }),
    false,
);
assert.equal(
    isCompletedForBranchPerformance({
        status: "APPROVED_BMC",
        pjumExportedAt: new Date("2026-05-01T00:00:00.000Z"),
    }),
    false,
);

const threshold = getBranchStuckThresholdDate(
    new Date("2026-05-29T12:00:00.000Z"),
);
assert.equal(threshold.toISOString(), "2026-05-15T12:00:00.000Z");

console.log("admin branch helper assertions passed");
