import assert from "node:assert/strict";
import { checklistCategories, type ChecklistItem } from "@/lib/checklist-data";
import { serializeChecklistItems } from "./draft-data";

const checklist = new Map<string, ChecklistItem>([
    [
        "A1",
        {
            id: "A1",
            name: "Bahu Jalan",
            condition: "rusak",
            handler: "BMS",
            notes: "Retak",
            ahoTicketNumber: "  AHO-123  ",
        },
    ],
    [
        "I1",
        {
            id: "I1",
            name: "Toilet",
            condition: "baik",
        },
    ],
]);

const result = serializeChecklistItems(checklist, checklistCategories);

assert.equal(result.find((item) => item.itemId === "A1")?.condition, "RUSAK");
assert.equal(
    result.find((item) => item.itemId === "A1")?.ahoTicketNumber,
    "AHO-123",
);
assert.equal(
    result.find((item) => item.itemId === "I1")?.preventiveCondition,
    "OK",
);
assert.equal(result.find((item) => item.itemId === "I1")?.condition, undefined);

checklist.set("A1", {
    ...checklist.get("A1")!,
    condition: "baik",
});
assert.equal(
    serializeChecklistItems(checklist, checklistCategories).find(
        (item) => item.itemId === "A1",
    )?.ahoTicketNumber,
    undefined,
);
assert.equal(
    serializeChecklistItems(checklist, checklistCategories).find(
        (item) => item.itemId === "A1",
    )?.handler,
    undefined,
);

const signageChecklist = new Map<string, ChecklistItem>([
    [
        "I11",
        {
            id: "I11",
            name: "Kondisi Fisik Shop Sign",
            condition: "rusak",
            signageMaterial: "Acrylic",
            signageCondition: "pudar",
            handler: "Rekanan",
            notes: "Warna pudar",
            ahoTicketNumber: "AHO-9",
        },
    ],
    [
        "I13",
        {
            id: "I13",
            name: "Kondisi Fisik Pole Sign",
            condition: "tidak_ada",
            signageMaterial: "TIDAK_ADA",
            signageCondition: "",
        },
    ],
]);
const signageResult = serializeChecklistItems(
    signageChecklist,
    checklistCategories,
);
const shopSign = signageResult.find((item) => item.itemId === "I11");
assert.equal(shopSign?.preventiveCondition, "NOT_OK");
assert.equal(shopSign?.handler, "REKANAN");
assert.equal(shopSign?.signageMaterial, "Acrylic");
assert.equal(shopSign?.signageCondition, "PUDAR");
const poleSign = signageResult.find((item) => item.itemId === "I13");
assert.equal(poleSign?.preventiveCondition, "TIDAK_ADA");
assert.equal(poleSign?.signageMaterial, undefined);
assert.equal(poleSign?.signageCondition, undefined);

console.log("draft-data tests passed");
