import assert from "node:assert/strict";
import { REPORT_CHECKLIST_ITEMS } from "./checklist-data";
import {
    SIGNAGE_ITEM_IDS,
    SIGNAGE_NOT_AVAILABLE,
    describeSignageCondition,
    fromSignageJsonFields,
    getSignageConfig,
    getSignageNotePlaceholder,
    isAhoRequiredForItem,
    isSignageDamaged,
    isSignageNoteRequired,
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
assert.equal(getSignageConfig("I11")?.allowNotAvailable, true);
assert.equal(getSignageConfig("I12")?.allowNotAvailable, true);
assert.equal(getSignageConfig("I13")?.allowNotAvailable, true);
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

assert.deepEqual(SIGNAGE_ITEM_IDS, ["I11", "I12", "I13"]);

assert.equal(
    getSignageNotePlaceholder("kotor"),
    "Contoh: kusam kotor / kotor, lampu redup / ada lampu yang mati. Rekomendasi cleaning.",
);
assert.equal(
    getSignageNotePlaceholder("PUDAR"),
    "Contoh: rekomendasi rekondisi ke GS karena pudar / warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
);
assert.equal(
    getSignageNotePlaceholder("rusak"),
    "Contoh: rekomendasi rekondisi ke GS karena retak / pecah / rapuh, warna hilang, ada lampu yang mati / redup. Sekalian vendor cek menyeluruh.",
);
assert.equal(getSignageNotePlaceholder("baik"), undefined);
assert.equal(getSignageNotePlaceholder(""), undefined);
assert.equal(getSignageNotePlaceholder(undefined), undefined);

assert.equal(isSignageNoteRequired("kotor"), true);
assert.equal(isSignageNoteRequired("PUDAR"), true);
assert.equal(isSignageNoteRequired("rusak"), true);
assert.equal(isSignageNoteRequired("baik"), false);
assert.equal(isSignageNoteRequired(""), false);
assert.equal(isSignageNoteRequired(undefined), false);

assert.equal(isAhoRequiredForItem("A1", false), true);
assert.equal(isAhoRequiredForItem("A1", true), true);
assert.equal(isAhoRequiredForItem("I11", false), false);
assert.equal(isAhoRequiredForItem("I13", true), true);

console.log("signage tests passed");
