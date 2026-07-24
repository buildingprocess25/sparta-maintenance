import assert from "node:assert/strict";
import {
    assertRetentionMutationApplied,
    isDeleteConfirmationValid,
    ReportRetentionConflictError,
    resolvePjumDetachments,
} from "./report-retention";

assert.equal(isDeleteConfirmationValid("RPT-001", "RPT-001"), true);
assert.equal(isDeleteConfirmationValid("RPT-001", "RPT-002"), false);

assert.deepEqual(
    resolvePjumDetachments("RPT-001", [
        {
            id: "approved",
            status: "APPROVED",
            reportNumbers: ["RPT-001"],
        },
    ]),
    {
        ok: false,
        error: "Laporan terikat PJUM yang sudah disetujui",
    },
);

assert.deepEqual(
    resolvePjumDetachments("RPT-001", [
        {
            id: "empty-after-detach",
            status: "PENDING_APPROVAL",
            reportNumbers: ["RPT-001"],
        },
        {
            id: "retained",
            status: "REJECTED",
            reportNumbers: ["RPT-001", "RPT-002"],
        },
    ]),
    {
        ok: true,
        deleteIds: ["empty-after-detach"],
        updates: [{ id: "retained", reportNumbers: ["RPT-002"] }],
        snapshots: [
            {
                id: "empty-after-detach",
                reportNumbers: ["RPT-001"],
            },
            {
                id: "retained",
                reportNumbers: ["RPT-001", "RPT-002"],
            },
        ],
    },
);

assert.doesNotThrow(() => assertRetentionMutationApplied(1));
assert.throws(
    () => assertRetentionMutationApplied(0),
    ReportRetentionConflictError,
);

console.log("report retention assertions passed");
