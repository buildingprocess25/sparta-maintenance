import assert from "node:assert/strict";
import {
    shapePreventiveMatrixExportData,
    type PreventiveMatrixExportRow,
} from "./annual-matrix-export";

const stores = [
    { code: "1A01", name: "JEND SUDIRMAN", branchName: "PEKANBARU" },
    { code: "1A02", name: "HR SOEBRANTAS", branchName: "PEKANBARU" },
    { code: "2B01", name: "ANTASARI", branchName: "LAMPUNG" },
];

const data = shapePreventiveMatrixExportData({
    stores,
    selectedQuarter: 3,
    status: "all",
    reports: [
        {
            reportNumber: "R-OLD",
            storeCode: "1A01",
            createdAt: new Date("2026-07-01T03:00:00.000Z"),
            createdByNIK: "BMS001",
            createdByName: "BMS Lama",
            totalReal: 12000,
        },
        {
            reportNumber: "R-NEW",
            storeCode: "1A01",
            createdAt: new Date("2026-07-15T03:00:00.000Z"),
            createdByNIK: "BMS002",
            createdByName: "BMS Baru",
            totalReal: 0,
        },
        {
            reportNumber: "R-Q2",
            storeCode: "1A02",
            createdAt: new Date("2026-05-02T03:00:00.000Z"),
            createdByNIK: "BMS003",
            createdByName: null,
            totalReal: null,
        },
    ],
});

const row1 = data.rows.find((row) => row.storeCode === "1A01") as PreventiveMatrixExportRow;
assert.equal(row1.q3?.bmsName, "BMS Baru");
assert.equal(row1.q3?.totalReal, 0);

const row2 = data.rows.find((row) => row.storeCode === "1A02") as PreventiveMatrixExportRow;
assert.equal(row2.q2?.bmsNIK, "BMS003");
assert.equal(row2.q2?.totalReal, null);
assert.equal(row2.q3, null);

const pendingQ3 = shapePreventiveMatrixExportData({
    stores,
    selectedQuarter: 3,
    status: "pending",
    reports: data.rows.flatMap((row) =>
        (["q1", "q2", "q3", "q4"] as const).flatMap((key) => {
            const cell = row[key];
            return cell
                ? [{
                      reportNumber: `${row.storeCode}-${key}`,
                      storeCode: row.storeCode,
                      createdAt: cell.doneAt,
                      createdByNIK: cell.bmsNIK,
                      createdByName: cell.bmsName,
                      totalReal: cell.totalReal,
                  }]
                : [];
        }),
    ),
});
assert.deepEqual(
    pendingQ3.rows.map((row) => row.storeCode),
    ["1A02", "2B01"],
);

const pekanbaru = data.branchSummaries.find((row) => row.branchName === "PEKANBARU");
assert.deepEqual(pekanbaru, {
    branchName: "PEKANBARU",
    totalStores: 2,
    completed: 1,
    pending: 1,
    coverage: 50,
    q1Total: 0,
    q2Total: 0,
    q3Total: 0,
    q4Total: 0,
    yearTotal: 0,
});

assert.equal(data.grandTotal.branchName, "GRAND TOTAL");
assert.equal(data.grandTotal.totalStores, 3);

console.log("preventive annual matrix export assertions passed");
