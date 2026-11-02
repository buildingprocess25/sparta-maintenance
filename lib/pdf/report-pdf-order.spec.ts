import assert from "node:assert/strict";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";
import { orderReportPdfContent } from "./report-pdf-order";

function item(itemId: string): ReportItemJson {
    return {
        itemId,
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
    };
}

function estimation(itemId: string, materialName: string): MaterialEstimationJson {
    return {
        itemId,
        materialName,
        quantity: 1,
        unit: "pcs",
        price: 1000,
        totalPrice: 1000,
    };
}

// 1. Items follow catalog order, with natural numbering (I2 before I11).
const items = ["G2", "E1", "A10", "A2", "G1", "I11", "I2"].map(item);
const estimations = [
    estimation("G2", "Besi hollow"),
    estimation("A2", "Semen"),
    estimation("G2", "Cat besi"),
    estimation("A10", "Bata ringan"),
    estimation("A2", "Pasir"),
];
const itemsBefore = items.map((i) => i.itemId);
const estimationsBefore = estimations.map((e) => e.materialName);

const ordered = orderReportPdfContent({ items, estimations });

assert.deepEqual(
    ordered.items.map((i) => i.itemId),
    ["A2", "A10", "E1", "G1", "G2", "I2", "I11"],
);

// 2. Estimations sorted by item; materials of the same item keep input order.
assert.deepEqual(
    ordered.estimations.map((e) => `${e.itemId}:${e.materialName}`),
    [
        "A2:Semen",
        "A2:Pasir",
        "A10:Bata ringan",
        "G2:Besi hollow",
        "G2:Cat besi",
    ],
);

// 3. Inputs are not mutated.
assert.deepEqual(
    items.map((i) => i.itemId),
    itemsBefore,
);
assert.deepEqual(
    estimations.map((e) => e.materialName),
    estimationsBefore,
);
assert.notEqual(ordered.items, items);
assert.notEqual(ordered.estimations, estimations);

// 4. Unknown item IDs go after catalog items.
const withUnknown = orderReportPdfContent({
    items: ["Z9", "B1", "A1"].map(item),
    estimations: [],
});
assert.deepEqual(
    withUnknown.items.map((i) => i.itemId),
    ["A1", "B1", "Z9"],
);

console.log("report-pdf-order tests passed");
