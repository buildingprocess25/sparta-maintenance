import assert from "node:assert/strict";
import {
    buildItemsJson,
    cleanReportItemsJson,
} from "./report-json-helpers";
import type { DraftData } from "./types";

const draft: DraftData = {
    checklistItems: [
        {
            itemId: "A1",
            itemName: "Nama redundan",
            categoryName: "Kategori redundan",
            condition: "RUSAK",
            handler: "BMS",
            photoUrl: "",
            notes: "  Perlu diperbaiki  ",
            ahoTicketNumber: "  AHO-001  ",
        },
    ],
    bmsEstimations: {},
};

assert.deepEqual(buildItemsJson(draft), [
    {
        itemId: "A1",
        condition: "RUSAK",
        handler: "BMS",
        notes: "  Perlu diperbaiki  ",
        ahoTicketNumber: "AHO-001",
    },
]);

assert.deepEqual(
    cleanReportItemsJson([
        {
            itemId: "A1",
            itemName: "Nama redundan",
            categoryName: "Kategori redundan",
            condition: "RUSAK",
            preventiveCondition: null,
            actualCost: 0,
            images: [],
            notes: "   ",
            realisasiItems: [
                {
                    materialName: "Lampu",
                    quantity: 1,
                    unit: "pcs",
                    price: 0,
                    totalPrice: 0,
                },
            ],
        },
    ]),
    [
        {
            itemId: "A1",
            condition: "RUSAK",
            actualCost: 0,
            realisasiItems: [
                {
                    materialName: "Lampu",
                    quantity: 1,
                    unit: "pcs",
                    price: 0,
                    totalPrice: 0,
                },
            ],
        },
    ],
);

console.log("report-json-helpers tests passed");
