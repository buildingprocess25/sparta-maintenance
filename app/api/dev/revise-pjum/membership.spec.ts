import assert from "node:assert/strict";
import {
    calculateRevisedPjumMembership,
    type PjumMembershipReport,
} from "./membership";

const reports: PjumMembershipReport[] = [
    { reportNumber: "R-7A", status: "COMPLETED", pjumExportedAt: new Date() },
    { reportNumber: "R-7B", status: "COMPLETED", pjumExportedAt: new Date() },
    { reportNumber: "R-8", status: "COMPLETED", pjumExportedAt: null },
    { reportNumber: "R-9", status: "COMPLETED", pjumExportedAt: null },
];

const result = calculateRevisedPjumMembership({
    existingReportNumbers: ["R-7A", "R-7B", "R-8"],
    rangeReports: reports.slice(2),
});

assert.deepEqual(result.revisedReportNumbers, ["R-8", "R-9"]);
assert.deepEqual(result.removedReportNumbers, ["R-7A", "R-7B"]);
assert.deepEqual(result.addedReportNumbers, ["R-9"]);

const manualRemoval = calculateRevisedPjumMembership({
    existingReportNumbers: ["R-7A", "R-7B", "R-8"],
    rangeReports: reports.slice(0, 3),
    removedReportNumbers: ["R-7B"],
});

assert.deepEqual(manualRemoval.revisedReportNumbers, ["R-7A", "R-8"]);
assert.deepEqual(manualRemoval.removedReportNumbers, ["R-7B"]);
assert.deepEqual(manualRemoval.addedReportNumbers, []);

assert.throws(
    () =>
        calculateRevisedPjumMembership({
            existingReportNumbers: ["R-7A"],
            rangeReports: [
                {
                    reportNumber: "R-8",
                    status: "IN_PROGRESS",
                    pjumExportedAt: null,
                },
            ],
        }),
    /Masih ada laporan dengan status IN_PROGRESS/,
);

assert.throws(
    () =>
        calculateRevisedPjumMembership({
            existingReportNumbers: ["R-7A"],
            rangeReports: [
                {
                    reportNumber: "R-8",
                    status: "COMPLETED",
                    pjumExportedAt: new Date(),
                },
            ],
        }),
    /sudah masuk PJUM lain/,
);
