import assert from "node:assert/strict";
import { isChecklistOnlyReport } from "./report-utils";
import type { ReportItemJson } from "@/types/report";

const item = (
    overrides: Partial<ReportItemJson>,
): ReportItemJson => ({
    itemId: "A1",
    condition: "BAIK",
    preventiveCondition: null,
    handler: null,
    ...overrides,
});

assert.equal(
    isChecklistOnlyReport([
        item({ condition: "BAIK", handler: "BMS" }),
        item({ itemId: "A2", condition: "RUSAK", handler: "REKANAN" }),
    ]),
    true,
);

assert.equal(
    isChecklistOnlyReport([item({ condition: "RUSAK", handler: "BMS" })]),
    false,
);

assert.equal(
    isChecklistOnlyReport([
        item({ condition: null, preventiveCondition: "NOT_OK", handler: "BMS" }),
    ]),
    false,
);

console.log("report-utils tests passed");
