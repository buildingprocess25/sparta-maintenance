import assert from "node:assert/strict";
import { mapPjumVerificationRecord } from "./validator-data";

const result = mapPjumVerificationRecord({
    id: "pjum-id",
    status: "APPROVED",
    verificationCode: "AB12CD34",
    branchName: "CIKOKOL RAYA",
    bmsNIK: "BMS001",
    bmsName: "RUDI HARTONO",
    weekNumber: 1,
    monthName: "September",
    fromDate: new Date("2026-09-07T00:00:00.000Z"),
    toDate: new Date("2026-09-15T00:00:00.000Z"),
    reportNumbers: ["IA54-2609-001", "IA54-2609-002"],
    approvedAt: new Date("2026-09-15T03:00:00.000Z"),
    approvedByNIK: "BNM001",
    approverName: "BNM TEST",
    pjumFinalDriveUrl: "https://drive.google.com/file/d/example/view",
    totalExpenditure: 1250000,
});

assert.equal(result.kind, "found");
if (result.kind !== "found") throw new Error("Expected found result");

assert.equal(result.status, "VALID");
assert.equal(result.displayCode, "PJUM-AB12CD34");
assert.equal(result.bmsName, "RUDI HARTONO");
assert.equal(result.approverName, "BNM TEST");
assert.deepEqual(result.reportNumbers, ["IA54-2609-001", "IA54-2609-002"]);
assert.equal(result.reportCount, 2);

console.log("pjum validator data mapping passed");
