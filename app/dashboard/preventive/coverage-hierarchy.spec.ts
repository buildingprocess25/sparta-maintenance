import assert from "node:assert/strict";
import {
    buildCoverageHierarchy,
    type CoverageReportInfo,
    type CoverageStoreInput,
} from "./coverage-hierarchy";

const stores: CoverageStoreInput[] = [
    {
        code: "T001",
        name: "Toko Bravo",
        branchName: "CIANJUR",
        assignments: [{ bmsNIK: "111", bmsName: "Andi" }],
    },
    {
        code: "T002",
        name: "Toko Alpha",
        branchName: "CIANJUR",
        // Assignment ganda: muncul di dua BMS, tapi dihitung sekali di cabang
        assignments: [
            { bmsNIK: "111", bmsName: "Andi" },
            { bmsNIK: "222", bmsName: "Budi" },
        ],
    },
    { code: "T003", name: "Toko Delta", branchName: "CIANJUR", assignments: [] },
    { code: "T004", name: "Toko Charlie", branchName: "CIANJUR", assignments: [] },
    {
        code: "B001",
        name: "Toko Bogor",
        branchName: "BOGOR",
        assignments: [{ bmsNIK: "333", bmsName: null }],
    },
    { code: "S001", name: "Toko Sukabumi", branchName: "SUKABUMI", assignments: [] },
];

const reports = new Map<string, CoverageReportInfo>([
    ["T002", { reportNumber: "R-T002", doneAt: "2026-10-05T03:00:00.000Z", doneByName: "Andi" }],
    ["T004", { reportNumber: "R-T004", doneAt: "2026-10-06T03:00:00.000Z", doneByName: "Citra" }],
    ["B001", { reportNumber: "R-B001", doneAt: "2026-10-07T03:00:00.000Z", doneByName: "Dedi" }],
]);

const result = buildCoverageHierarchy(stores, reports);

// Cabang diurutkan per nama
assert.deepEqual(
    result.map((b) => b.branchName),
    ["BOGOR", "CIANJUR", "SUKABUMI"],
);

// CIANJUR: total dari toko unik (4), bukan penjumlahan BMS (2 + 1 + 2 = 5)
const cianjur = result.find((b) => b.branchName === "CIANJUR")!;
assert.deepEqual(
    [cianjur.bmsCount, cianjur.totalStores, cianjur.completedStores, cianjur.pendingStores, cianjur.coverageRate],
    [2, 4, 2, 2, 50],
);

// Angka per BMS tetap seperti sebelumnya; toko ganda ada di kedua BMS
assert.deepEqual(
    cianjur.bmsList.map((b) => [b.nik, b.name, b.totalStores, b.completedStores, b.pendingStores, b.kpiRate]),
    [
        ["111", "Andi", 2, 1, 1, 50],
        ["222", "Budi", 1, 1, 0, 100],
    ],
);
assert.deepEqual(
    cianjur.bmsList[0].stores.map((s) => s.storeCode),
    ["T002", "T001"],
);

// Toko tanpa assignment masuk unassigned, diurutkan per nama toko
assert.ok(cianjur.unassigned);
assert.deepEqual(
    [
        cianjur.unassigned.totalStores,
        cianjur.unassigned.completedStores,
        cianjur.unassigned.pendingStores,
        cianjur.unassigned.coverageRate,
    ],
    [2, 1, 1, 50],
);
assert.deepEqual(
    cianjur.unassigned.stores.map((s) => [s.storeCode, s.isCompleted, s.reportNumber ?? null, s.doneByName ?? null]),
    [
        ["T004", true, "R-T004", "Citra"],
        ["T003", false, null, null],
    ],
);

// BOGOR: semua toko ter-assign → unassigned null; nama BMS fallback ke NIK
const bogor = result.find((b) => b.branchName === "BOGOR")!;
assert.equal(bogor.unassigned, null);
assert.equal(bogor.bmsList[0].name, "333");
assert.deepEqual([bogor.totalStores, bogor.completedStores, bogor.coverageRate], [1, 1, 100]);

// SUKABUMI: cabang tanpa assignment sama sekali tetap muncul
const sukabumi = result.find((b) => b.branchName === "SUKABUMI")!;
assert.deepEqual(
    [sukabumi.bmsCount, sukabumi.bmsList.length, sukabumi.totalStores, sukabumi.pendingStores, sukabumi.coverageRate],
    [0, 0, 1, 1, 0],
);
assert.equal(sukabumi.unassigned?.totalStores, 1);

// Input kosong
assert.deepEqual(buildCoverageHierarchy([], new Map()), []);

console.log("coverage-hierarchy assertions passed");
