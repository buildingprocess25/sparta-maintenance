import assert from "node:assert/strict";
import {
    createResubmitDataSchema,
    draftAutosaveDataSchema,
    draftDataSchema,
} from "./types";


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

function makeSignageItem(overrides: Record<string, unknown> = {}) {
    return {
        itemId: "I11",
        itemName: "Kondisi Fisik Shop Sign",
        categoryName: "I. Preventif Equipment Toko",
        preventiveCondition: "NOT_OK",
        signageMaterial: "Acrylic",
        signageCondition: "RUSAK",
        handler: "REKANAN",
        notes: "Huruf lepas",
        ahoTicketNumber: "AHO-SIGN",
        ...overrides,
    };
}

const isValid = (items: unknown[]) =>
    draftDataSchema.safeParse(makeDraft(items)).success;

assert.equal(isValid([makeSignageItem()]), true);
assert.equal(isValid([makeSignageItem({ signageMaterial: "Kayu" })]), false);
assert.equal(isValid([makeSignageItem({ handler: "BMS" })]), false);
assert.equal(isValid([makeSignageItem({ signageCondition: "KOTOR" })]), false);
assert.equal(
    isValid([
        makeSignageItem({
            preventiveCondition: "OK",
            signageCondition: "KOTOR",
            handler: undefined,
            notes: undefined,
            ahoTicketNumber: undefined,
        }),
    ]),
    true,
);
assert.equal(
    isValid([
        makeSignageItem({
            preventiveCondition: "OK",
            signageCondition: "BAIK",
            signageMaterial: undefined,
            handler: undefined,
            notes: undefined,
            ahoTicketNumber: undefined,
        }),
    ]),
    false,
);
const notAvailable = {
    preventiveCondition: "TIDAK_ADA",
    signageMaterial: undefined,
    signageCondition: undefined,
    handler: undefined,
    notes: undefined,
    ahoTicketNumber: undefined,
};
assert.equal(isValid([makeSignageItem(notAvailable)]), false);
assert.equal(
    isValid([makeSignageItem({ ...notAvailable, itemId: "I13" })]),
    true,
);
assert.equal(isValid([makeItem({ signageCondition: "BAIK" })]), false);

// Tiket AHO grup signage
assert.equal(
    isValid([makeSignageItem(), makeSignageItem({ itemId: "I12" })]),
    true,
);
assert.equal(
    isValid([
        makeSignageItem(),
        makeSignageItem({ itemId: "I12", ahoTicketNumber: "AHO-LAIN" }),
    ]),
    false,
);
assert.equal(
    isValid([makeItem(), makeSignageItem({ ahoTicketNumber: "AHO-001" })]),
    false,
);
assert.equal(
    isValid([makeItem(), makeItem({ itemId: "A2", itemName: "Dekker" })]),
    false,
);
// Autosave draft tidak memeriksa konflik tiket.
assert.equal(
    draftAutosaveDataSchema.safeParse(
        makeDraft([
            makeSignageItem(),
            makeSignageItem({ itemId: "I12", ahoTicketNumber: "AHO-LAIN" }),
        ]),
    ).success,
    true,
);

console.log("report action type tests passed");
