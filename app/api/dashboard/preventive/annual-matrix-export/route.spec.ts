import assert from "node:assert/strict";
import { formatQuarterCellForExport } from "./format";

assert.equal(
    formatQuarterCellForExport({
        doneAt: new Date("2026-06-05T03:00:00.000Z"),
        bmsName: "JULIYAN ERDIANSYAH",
        bmsNIK: "BMS001",
        totalReal: 86000,
    }),
    "05 Jun 2026 - JULIYAN ERDIANSYAH",
);

assert.equal(formatQuarterCellForExport(null), "Belum");

console.log("preventive matrix export route assertions passed");
