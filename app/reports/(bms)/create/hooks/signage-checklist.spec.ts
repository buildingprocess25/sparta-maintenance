import assert from "node:assert/strict";
import type { ChecklistItem } from "@/lib/checklist-data";
import { SIGNAGE_NOT_AVAILABLE } from "@/lib/signage";
import {
    applySignageSelection,
    fillGroupAhoTicket,
    propagateGroupAhoTicket,
    toAhoTicketHolders,
} from "./signage-checklist";

const base: ChecklistItem = {
    id: "I11",
    name: "Kondisi Fisik Shop Sign",
    condition: "",
};

let item = applySignageSelection(base, { field: "material", value: "Acrylic" });
assert.equal(item.signageMaterial, "Acrylic");
assert.equal(item.condition, "");

item = applySignageSelection(item, { field: "condition", value: "kotor" });
assert.equal(item.signageCondition, "kotor");
assert.equal(item.condition, "baik");
assert.equal(item.handler, "");

item = applySignageSelection(item, { field: "condition", value: "pudar" });
assert.equal(item.condition, "rusak");
assert.equal(item.handler, "Rekanan");

// Ganti material tidak menghapus kondisi.
item = applySignageSelection(item, { field: "material", value: "Embos" });
assert.equal(item.signageCondition, "pudar");
assert.equal(item.condition, "rusak");

// Batal pilih kondisi.
const cleared = applySignageSelection(item, { field: "condition", value: "" });
assert.equal(cleared.condition, "");
assert.equal(cleared.handler, "");

// Tidak Ada menghapus kondisi, catatan, tiket.
const pole = applySignageSelection(
    {
        id: "I13",
        name: "Kondisi Fisik Pole Sign",
        condition: "rusak",
        signageMaterial: "Vynil",
        signageCondition: "rusak",
        handler: "Rekanan",
        notes: "Retak",
        ahoTicketNumber: "T1",
    },
    { field: "material", value: SIGNAGE_NOT_AVAILABLE },
);
assert.equal(pole.condition, "tidak_ada");
assert.equal(pole.signageCondition, "");
assert.equal(pole.handler, "");
assert.equal(pole.notes, undefined);
assert.equal(pole.ahoTicketNumber, undefined);

// Kembali dari Tidak Ada mengosongkan kondisi.
const poleBack = applySignageSelection(pole, {
    field: "material",
    value: "Acrylic",
});
assert.equal(poleBack.condition, "");
assert.equal(poleBack.signageMaterial, "Acrylic");

// Tiket grup
const checklist = new Map<string, ChecklistItem>([
    [
        "A22",
        {
            id: "A22",
            name: "KwH",
            condition: "rusak",
            handler: "BMS",
            ahoTicketNumber: "ABC",
        },
    ],
    [
        "I11",
        {
            id: "I11",
            name: "Shop Sign",
            condition: "rusak",
            signageMaterial: "Acrylic",
            signageCondition: "rusak",
            handler: "Rekanan",
            ahoTicketNumber: "BCD",
        },
    ],
    [
        "I13",
        {
            id: "I13",
            name: "Pole Sign",
            condition: "rusak",
            signageMaterial: "Vynil",
            signageCondition: "pudar",
            handler: "Rekanan",
            ahoTicketNumber: "STALE",
        },
    ],
]);

const filled = fillGroupAhoTicket(checklist, "I13");
assert.equal(filled.get("I13")?.ahoTicketNumber, "BCD");
assert.equal(fillGroupAhoTicket(checklist, "A22"), checklist);

filled.set("I11", { ...filled.get("I11")!, ahoTicketNumber: "EFG" });
const propagated = propagateGroupAhoTicket(filled, "I11");
assert.equal(propagated.get("I13")?.ahoTicketNumber, "EFG");
assert.equal(propagated.get("A22")?.ahoTicketNumber, "ABC");
assert.equal(propagateGroupAhoTicket(filled, "A22"), filled);

assert.deepEqual(
    toAhoTicketHolders(
        new Map([
            [
                "A1",
                {
                    id: "A1",
                    name: "Bahu Jalan",
                    condition: "baik",
                    ahoTicketNumber: "OLD",
                } satisfies ChecklistItem,
            ],
        ]),
    ),
    [],
);

console.log("signage checklist tests passed");
