import assert from "node:assert/strict";
import {
    PJUM_SELECTION_LIMIT,
    evaluatePjumSelectionPolicy,
} from "./pjum-selection-policy";

const rows = [
    {
        reportNumber: "GANTUNG-1",
        totalRealisasi: 450_000,
        isHangingReport: true,
        isValid: true,
    },
    {
        reportNumber: "BARU-1",
        totalRealisasi: 400_000,
        isHangingReport: false,
        isValid: true,
    },
    {
        reportNumber: "BARU-2",
        totalRealisasi: 250_000,
        isHangingReport: false,
        isValid: true,
    },
    {
        reportNumber: "TIDAK-VALID",
        totalRealisasi: 100_000,
        isHangingReport: false,
        isValid: false,
    },
];

const ok = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["GANTUNG-1", "BARU-1"],
});
assert.deepEqual(ok.mandatoryHangingReportNumbers, ["GANTUNG-1"]);
assert.deepEqual(ok.missingMandatoryHangingReportNumbers, []);
assert.equal(ok.selectedTotal, 850_000);
assert.equal(ok.selectedCount, 2);
assert.equal(ok.exceedsLimit, false);
assert.equal(ok.limit, PJUM_SELECTION_LIMIT);

const missing = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["BARU-1"],
});
assert.deepEqual(missing.missingMandatoryHangingReportNumbers, ["GANTUNG-1"]);

const over = evaluatePjumSelectionPolicy({
    rows,
    selectedReportNumbers: ["GANTUNG-1", "BARU-1", "BARU-2"],
});
assert.equal(over.selectedTotal, 1_100_000);
assert.equal(over.exceedsLimit, true);

const hangingAloneOver = evaluatePjumSelectionPolicy({
    rows: [
        {
            reportNumber: "GANTUNG-BESAR",
            totalRealisasi: 1_100_000,
            isHangingReport: true,
            isValid: true,
        },
    ],
    selectedReportNumbers: ["GANTUNG-BESAR"],
});
assert.equal(hangingAloneOver.exceedsLimit, true);

console.log("PJUM selection policy assertions passed");
