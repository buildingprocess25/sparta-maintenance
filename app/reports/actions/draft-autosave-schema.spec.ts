import assert from "node:assert/strict";
import { draftAutosaveDataSchema } from "./types";

const incompleteDamagedDraft = draftAutosaveDataSchema.safeParse({
    draftReportNumber: "A08-20260914-001",
    storeCode: "A08",
    storeName: "Alfamart 08",
    branchName: "TANGERANG",
    checklistItems: [
        {
            itemId: "A1",
            itemName: "Bahu Jalan",
            categoryName: "A. Bangunan",
            condition: "RUSAK",
            handler: "BMS",
        },
    ],
    bmsEstimations: {},
    totalEstimation: 0,
    draftCreatedAt: "2026-09-14T13:00:00.000Z",
});

assert.equal(
    incompleteDamagedDraft.success,
    true,
    "autosave schema must accept incomplete damaged items; submit validation remains stricter",
);

const unknownItem = draftAutosaveDataSchema.safeParse({
    checklistItems: [{ itemId: "UNKNOWN", itemName: "X", categoryName: "X" }],
    bmsEstimations: {},
});

assert.equal(
    unknownItem.success,
    false,
    "autosave must still reject unknown checklist item IDs",
);

console.log("draft autosave schema tests passed");
