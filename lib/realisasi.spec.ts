import assert from "node:assert/strict";
import {
    calculateItemRealisasiTotal,
    calculateTotalRealisasiFromItems,
} from "./realisasi";
import type { ReportItemJson } from "@/types/report";

const items: ReportItemJson[] = [
    {
        itemId: "A1",
        itemName: "Bahu Jalan",
        categoryName: "A. Bagian Depan",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        discountAmount: 25_000,
        realisasiItems: [
            {
                materialName: "Semen",
                quantity: 2,
                unit: "sak",
                price: 50_000,
                totalPrice: 100_000,
            },
            {
                materialName: "Paku",
                quantity: 1,
                unit: "pack",
                price: 0,
                totalPrice: 0,
            },
        ],
    },
    {
        itemId: "A2",
        itemName: "Pintu",
        categoryName: "A. Bagian Depan",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        realisasiItems: [
            {
                materialName: "Engsel",
                quantity: 1,
                unit: "pcs",
                price: 10_000,
                totalPrice: 10_000,
            },
        ],
    },
];

assert.equal(calculateItemRealisasiTotal(items[0]), 75_000);
assert.equal(calculateTotalRealisasiFromItems(items), 85_000);
assert.equal(
    calculateItemRealisasiTotal({
        ...items[0],
        discountAmount: 125_000,
    }),
    0,
);
