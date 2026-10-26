import assert from "node:assert/strict";
import { REPORT_CHECKLIST_ITEMS } from "./checklist-data";
import {
    SIGNAGE_NOT_AVAILABLE,
    describeSignageCondition,
    fromSignageJsonFields,
    getSignageConfig,
    isSignageDamaged,
    toChecklistCondition,
    toSignageJsonFields,
} from "./signage";

// Katalog
assert.deepEqual(getSignageConfig("I11")?.materials, ["Embos", "Acrylic"]);
assert.deepEqual(getSignageConfig("I12")?.materials, [
    "Embos",
    "Acrylic",
    "ACP/Alucopan",
]);
assert.deepEqual(getSignageConfig("I13")?.materials, ["Acrylic", "Vynil"]);
assert.equal(getSignageConfig("I13")?.allowNotAvailable, true);
assert.equal(getSignageConfig("I11")?.allowNotAvailable, undefined);
assert.equal(getSignageConfig("A1"), undefined);
assert.equal(
    REPORT_CHECKLIST_ITEMS.find((item) => item.id === "I11")?.ahoTicketGroup,
    "signage",
);

// Kondisi
assert.equal(isSignageDamaged("pudar"), true);
assert.equal(isSignageDamaged("RUSAK"), true);
assert.equal(isSignageDamaged("kotor"), false);
assert.equal(isSignageDamaged(undefined), false);
assert.equal(toChecklistCondition("baik"), "baik");
assert.equal(toChecklistCondition("kotor"), "baik");
assert.equal(toChecklistCondition("pudar"), "rusak");
assert.equal(toChecklistCondition("rusak"), "rusak");
assert.equal(toChecklistCondition(""), "");

// Form → JSON
assert.deepEqual(
    toSignageJsonFields({
        id: "I11",
        signageMaterial: "Acrylic",
        signageCondition: "kotor",
    }),
    { signageMaterial: "Acrylic", signageCondition: "KOTOR" },
);
assert.deepEqual(
    toSignageJsonFields({
        id: "I13",
        signageMaterial: SIGNAGE_NOT_AVAILABLE,
        signageCondition: "",
    }),
    {},
);
assert.deepEqual(
    toSignageJsonFields({ id: "I11", signageMaterial: "Acrylic" }),
    {},
);
assert.deepEqual(
    toSignageJsonFields({
        id: "A1",
        signageMaterial: "Acrylic",
        signageCondition: "baik",
    }),
    {},
);

// JSON → form
assert.deepEqual(
    fromSignageJsonFields({
        itemId: "I12",
        preventiveCondition: "NOT_OK",
        signageMaterial: "ACP/Alucopan",
        signageCondition: "PUDAR",
    }),
    { signageMaterial: "ACP/Alucopan", signageCondition: "pudar" },
);
assert.deepEqual(
    fromSignageJsonFields({ itemId: "I13", preventiveCondition: "TIDAK_ADA" }),
    { signageMaterial: SIGNAGE_NOT_AVAILABLE },
);
assert.deepEqual(
    fromSignageJsonFields({ itemId: "A1", preventiveCondition: "OK" }),
    {},
);

// Label
assert.deepEqual(
    describeSignageCondition({
        signageCondition: "RUSAK",
        signageMaterial: "Acrylic",
    }),
    {
        label: "Rusak",
        material: "Acrylic",
        text: "Rusak · Acrylic",
        isDamaged: true,
    },
);
assert.deepEqual(describeSignageCondition({ signageCondition: "kotor" }), {
    label: "Kotor",
    material: undefined,
    text: "Kotor",
    isDamaged: false,
});
assert.equal(describeSignageCondition({}), null);
assert.equal(describeSignageCondition({ signageCondition: "OK" }), null);

console.log("signage tests passed");
