import assert from "node:assert/strict";

import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    BMS_BALANCE_CUTOVER_REFERENCE_DATE,
    BMS_INITIAL_HANGING_REPORT_CUTOVER,
    isInitialHangingReportCandidate,
} from "./bms-balance-cutover-policy";

const bmsItems = [
    {
        itemId: "A1",
        condition: "RUSAK",
        handler: "BMS",
        realisasiItems: [
            {
                materialName: "Semen",
                unit: "sak",
                quantity: 1,
                price: 100_000,
                totalPrice: 100_000,
            },
        ],
    },
];

assert.equal(
    BMS_BALANCE_CUTOVER_REFERENCE_DATE.toISOString(),
    "2026-09-17T17:00:00.000Z",
);
assert.equal(
    BMS_INITIAL_HANGING_REPORT_CUTOVER.toISOString(),
    "2026-06-17T17:00:00.000Z",
);
assert.equal(
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER.toISOString(),
    "2026-09-10T17:00:00.000Z",
);

assert.equal(
    isInitialHangingReportCandidate({
        status: "COMPLETED",
        finishedAt: new Date("2026-06-18T01:00:00.000+07:00"),
        pjumExportedAt: null,
        pjumHangingAt: null,
        pjumExpiredAt: null,
        totalReal: 100_000,
        items: bmsItems,
    }),
    true,
);

assert.equal(
    isInitialHangingReportCandidate({
        status: "COMPLETED",
        finishedAt: new Date("2026-06-17T23:59:59.000+07:00"),
        pjumExportedAt: null,
        pjumHangingAt: null,
        pjumExpiredAt: null,
        totalReal: 100_000,
        items: bmsItems,
    }),
    false,
);

assert.equal(
    isInitialHangingReportCandidate({
        status: "COMPLETED",
        finishedAt: new Date("2026-08-01T01:00:00.000+07:00"),
        pjumExportedAt: new Date("2026-08-02T01:00:00.000+07:00"),
        pjumHangingAt: null,
        pjumExpiredAt: null,
        totalReal: 100_000,
        items: bmsItems,
    }),
    false,
);

assert.equal(
    isInitialHangingReportCandidate({
        status: "COMPLETED",
        finishedAt: new Date("2026-08-01T01:00:00.000+07:00"),
        pjumExportedAt: null,
        pjumHangingAt: null,
        pjumExpiredAt: null,
        totalReal: 0,
        items: [],
    }),
    false,
);

console.log("BMS balance cutover policy assertions passed");
