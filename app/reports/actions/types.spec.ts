import assert from "node:assert/strict";
import { createResubmitDataSchema, draftDataSchema } from "./types";

function makeItem(overrides: Record<string, unknown> = {}) {
    return {
        itemId: "A1",
        itemName: "Bahu Jalan",
        categoryName: "A. Bagian Depan Bangunan",
        condition: "RUSAK",
        handler: "BMS",
        notes: "Retak",
        ahoTicketNumber: "AHO-001",
        ...overrides,
    };
}

function makeDraft(checklistItems: unknown[]) {
    return {
        checklistItems,
        bmsEstimations: {},
    };
}

assert.equal(draftDataSchema.safeParse(makeDraft([makeItem()])).success, true);
assert.equal(
    draftDataSchema.safeParse(
        makeDraft([makeItem({ itemId: "UNKNOWN-ITEM" })]),
    ).success,
    false,
);
assert.equal(
    draftDataSchema.safeParse(
        makeDraft([makeItem({ ahoTicketNumber: "A".repeat(101) })]),
    ).success,
    false,
);
assert.equal(
    draftDataSchema.safeParse(makeDraft([makeItem(), makeItem()])).success,
    false,
);

const parsedWithUnknownFields = draftDataSchema.parse({
    ...makeDraft([makeItem({ unexpectedItemField: "drop-me" })]),
    unexpectedRootField: "drop-me",
});
assert.equal("unexpectedRootField" in parsedWithUnknownFields, false);
assert.equal(
    "unexpectedItemField" in parsedWithUnknownFields.checklistItems[0],
    false,
);

assert.equal(
    createResubmitDataSchema(new Set(["LEGACY-1"])).safeParse(
        makeDraft([makeItem({ itemId: "LEGACY-1" })]),
    ).success,
    true,
);
assert.equal(
    createResubmitDataSchema(new Set()).safeParse(
        makeDraft([makeItem({ itemId: "LEGACY-1" })]),
    ).success,
    false,
);

console.log("report action type tests passed");
