import assert from "node:assert/strict";

import { AHO_IMPORT_MAX_ROWS, ahoImportPayloadSchema, normalizeAhoStatus } from "./import-payload";

assert.equal(normalizeAhoStatus("Progress"), "Progress");
assert.equal(normalizeAhoStatus(" PROGRESS "), "Progress");
assert.equal(normalizeAhoStatus("new"), "New");
assert.equal(normalizeAhoStatus("Closed"), null);
assert.equal(normalizeAhoStatus("Solve"), null);
assert.equal(normalizeAhoStatus(""), null);

const validRow = {
    storeCode: " t001 ",
    problemNo: "P-001",
    status: "Progress",
    branchCode: "G001",
    branchName: "SIDOARJO",
};
const base = { printDate: "2026-10-26T02:08:52.000Z", totalRows: 1, skippedNonActive: 0, rows: [validRow] };

const ok = ahoImportPayloadSchema.safeParse(base);
assert.equal(ok.success, true);
if (ok.success) assert.equal(ok.data.rows[0].storeCode, "T001");

assert.equal(ahoImportPayloadSchema.safeParse({ ...base, printDate: null, rows: [] }).success, true);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, printDate: "26-Oct-2026 - 09:08:52" }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, rows: [{ ...validRow, storeCode: "  " }] }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, rows: [{ ...validRow, problemNo: "" }] }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse({ ...base, totalRows: -1 }).success, false);
assert.equal(ahoImportPayloadSchema.safeParse("rep_problem.xlsx").success, false);
assert.ok(AHO_IMPORT_MAX_ROWS >= 300_000);

console.log("import-payload.spec: all assertions passed");
