import assert from "node:assert/strict";
import {
    classifyPjumApprovalReports,
    getPjumHangingExpirySummary,
    isActivePjumHangingReport,
} from "./pjum-hanging";

const fromDate = new Date("2026-08-01T00:00:00.000Z");
const toEndExclusive = new Date("2026-08-08T00:00:00.000Z");

const result = classifyPjumApprovalReports({
    reports: [
        {
            reportNumber: "A",
            status: "COMPLETED",
            finishedAt: new Date("2026-08-03T10:00:00.000Z"),
            requiresPjum: true,
            pjumExportedAt: new Date("2026-08-08T01:00:00.000Z"),
            pjumHangingAt: null,
            pjumExpiredAt: null,
        },
        {
            reportNumber: "E",
            status: "COMPLETED",
            finishedAt: new Date("2026-08-06T10:00:00.000Z"),
            requiresPjum: true,
            pjumExportedAt: null,
            pjumHangingAt: null,
            pjumExpiredAt: null,
        },
        {
            reportNumber: "OLD-OMITTED",
            status: "COMPLETED",
            finishedAt: new Date("2026-07-30T10:00:00.000Z"),
            requiresPjum: true,
            pjumExportedAt: null,
            pjumHangingAt: new Date("2026-08-01T01:00:00.000Z"),
            pjumExpiredAt: null,
        },
        {
            reportNumber: "OLD-INCLUDED",
            status: "COMPLETED",
            finishedAt: new Date("2026-07-30T11:00:00.000Z"),
            requiresPjum: true,
            pjumExportedAt: new Date("2026-08-08T01:00:00.000Z"),
            pjumHangingAt: new Date("2026-08-01T01:00:00.000Z"),
            pjumExpiredAt: null,
        },
        {
            reportNumber: "AFTER-CUTOFF",
            status: "COMPLETED",
            finishedAt: new Date("2026-08-08T10:00:00.000Z"),
            requiresPjum: true,
            pjumExportedAt: null,
            pjumHangingAt: null,
            pjumExpiredAt: null,
        },
        {
            reportNumber: "NO-PJUM",
            status: "COMPLETED",
            finishedAt: new Date("2026-08-04T10:00:00.000Z"),
            requiresPjum: false,
            pjumExportedAt: null,
            pjumHangingAt: null,
            pjumExpiredAt: null,
        },
    ],
    approvedReportNumbers: ["A", "OLD-INCLUDED"],
    fromDate,
    toEndExclusive,
});

assert.deepEqual(result.carryReportNumbers, ["E"]);
assert.deepEqual(result.expireReportNumbers, ["OLD-OMITTED"]);

assert.equal(
    isActivePjumHangingReport({
        pjumHangingAt: new Date("2026-08-08T01:00:00.000Z"),
        pjumExpiredAt: null,
        pjumExportedAt: null,
    }),
    true,
);
assert.equal(
    isActivePjumHangingReport({
        pjumHangingAt: new Date("2026-08-08T01:00:00.000Z"),
        pjumExpiredAt: new Date("2026-08-15T01:00:00.000Z"),
        pjumExportedAt: null,
    }),
    false,
);

assert.deepEqual(
    getPjumHangingExpirySummary([
        { reportNumber: "E", realizedAmount: 300_000 },
        { reportNumber: "F", realizedAmount: 250_000 },
    ]),
    {
        count: 2,
        totalRealization: 550_000,
        reportNumbers: ["E", "F"],
    },
);
assert.equal(
    isActivePjumHangingReport({
        pjumHangingAt: new Date("2026-08-08T01:00:00.000Z"),
        pjumExpiredAt: null,
        pjumExportedAt: new Date("2026-08-14T01:00:00.000Z"),
    }),
    false,
);

console.log("PJUM hanging classification assertions passed");
