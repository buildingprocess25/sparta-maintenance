import assert from "node:assert/strict";
import {
    buildPjumVerificationUrl,
    derivePjumPublicVerificationStatus,
    formatPjumVerificationDisplayCode,
    generatePjumVerificationSecret,
} from "./pjum-verification";

const first = generatePjumVerificationSecret();
const second = generatePjumVerificationSecret();

assert.match(first.token, /^[A-Za-z0-9_-]{32,}$/);
assert.match(first.code, /^[A-Z0-9]{8}$/);
assert.notEqual(first.token, second.token);
assert.notEqual(first.code, second.code);
assert.equal(formatPjumVerificationDisplayCode("AB12CD34"), "PJUM-AB12CD34");

assert.equal(
    buildPjumVerificationUrl({
        baseUrl: "https://maintenance.sparta-alfamart.web.id/",
        token: "abc_123",
    }),
    "https://maintenance.sparta-alfamart.web.id/v/pjum/abc_123",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "APPROVED",
        approvedAt: new Date("2026-09-15T01:00:00.000Z"),
        approvedByNIK: "12345",
        pjumFinalDriveUrl: "https://drive.google.com/file/d/example/view",
    }),
    "VALID",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "APPROVED",
        approvedAt: new Date("2026-09-15T01:00:00.000Z"),
        approvedByNIK: "12345",
        pjumFinalDriveUrl: null,
    }),
    "NEEDS_REVIEW",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "PENDING_APPROVAL",
        approvedAt: null,
        approvedByNIK: null,
        pjumFinalDriveUrl: null,
    }),
    "NEEDS_REVIEW",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "REJECTED",
        approvedAt: null,
        approvedByNIK: null,
        pjumFinalDriveUrl: null,
    }),
    "INVALID",
);

console.log("pjum-verification helpers passed");
