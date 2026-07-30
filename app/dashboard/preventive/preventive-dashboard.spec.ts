import assert from "node:assert/strict";
import {
    splitPreventiveRows,
    summarizePreventiveBranches,
    paginatePreventiveRows,
} from "./preventive-dashboard";

const rows = [
    { storeCode: "A001", branchName: "PEKANBARU", areaName: "KARAWANG", q3: null },
    { storeCode: "A002", branchName: "PEKANBARU", areaName: "PARUNG", q3: { reportNumber: "A002-001" } },
    { storeCode: "B001", branchName: "LAMPUNG", areaName: "SERANG", q3: null },
];

const quarterRows = splitPreventiveRows(rows, "q3");
assert.deepEqual(
    quarterRows.completed.map((row) => row.storeCode),
    ["A002"],
);
assert.deepEqual(
    quarterRows.pending.map((row) => row.storeCode),
    ["A001", "B001"],
);

assert.deepEqual(
    summarizePreventiveBranches(rows, "q3"),
    [
        { branchName: "LAMPUNG", totalStores: 1, completed: 0, pending: 1 },
        { branchName: "PEKANBARU", totalStores: 2, completed: 1, pending: 1 },
    ],
);

console.log("preventive dashboard assertions passed");

// Task 2: paginatePreventiveRows paging assertions
const pendingRows = splitPreventiveRows(rows, "q3").pending;
assert.deepEqual(paginatePreventiveRows(pendingRows, null, 1), { rows: [rows[0]], nextCursor: "A001" });
assert.deepEqual(paginatePreventiveRows(pendingRows, "A001", 1), { rows: [rows[2]], nextCursor: null });

console.log("paginatePreventiveRows paging assertions passed");
