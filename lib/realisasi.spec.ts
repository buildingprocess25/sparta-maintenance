import assert from "node:assert/strict";
import {
    buildRealisasiDanaTaktisSummary,
    calculateItemRealisasiTotal,
    calculateTotalRealisasiFromItems,
    requiresPjum,
} from "./realisasi";
import type { MaterialEstimationJson, ReportItemJson } from "@/types/report";

// ─── calculateItemRealisasiTotal & calculateTotalRealisasiFromItems ───────────

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

// ─── Kasus 1: material sama di dua item berbeda, tetap baris terpisah ────────

const duplicatedItems: ReportItemJson[] = [
    {
        itemId: "B1",
        itemName: "Item 1",
        categoryName: "B",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        realisasiItems: [
            {
                materialName: "Semen",
                quantity: 1,
                unit: "sak",
                price: 45_000,
                totalPrice: 45_000,
            },
        ],
    },
    {
        itemId: "B2",
        itemName: "Item 2",
        categoryName: "B",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        discountAmount: 5_000,
        realisasiItems: [
            {
                materialName: "Semen",
                quantity: 2,
                unit: "sak",
                price: 50_000,
                totalPrice: 100_000,
            },
            {
                materialName: "Kuas",
                quantity: 1,
                unit: "pcs",
                price: 10_000,
                totalPrice: 12_000,
            },
        ],
    },
];

const duplicatedEstimations: MaterialEstimationJson[] = [
    {
        itemId: "B1",
        materialName: "Semen",
        quantity: 1,
        unit: "sak",
        price: 40_000,
        totalPrice: 40_000,
    },
    {
        itemId: "B2",
        materialName: "Semen",
        quantity: 2,
        unit: "sak",
        price: 45_000,
        totalPrice: 90_000,
    },
];

const summary = buildRealisasiDanaTaktisSummary(duplicatedItems, duplicatedEstimations);

// 3 realisasiItem total → 3 baris terpisah
assert.equal(summary.visibleRows.length, 3, "harus ada 3 baris terpisah");

const [row0, row1, row2] = summary.visibleRows;

// Baris 0: Semen B1 — ada estimasi untuk B1::semen::sak
assert.equal(row0.material, "Semen");
assert.equal(row0.realQty, 1);
assert.equal(row0.realTotal, 45_000);
assert.equal(row0.estTotal, 40_000, "estimasi Semen B1 = 40k");

// Baris 1: Semen B2 — ada estimasi untuk B2::semen::sak
assert.equal(row1.material, "Semen");
assert.equal(row1.realQty, 2);
assert.equal(row1.realTotal, 100_000);
assert.equal(row1.estTotal, 90_000, "estimasi Semen B2 = 90k (per-item!)");

// Baris 2: Kuas B2 — TIDAK ada estimasi → kolom estimasi kosong/0
assert.equal(row2.material, "Kuas");
assert.equal(row2.estQty, 0, "Kuas tidak diestimasi → estQty harus 0");
assert.equal(row2.estTotal, 0, "Kuas tidak diestimasi → estTotal harus 0");

// Total
assert.equal(summary.totalRealisasiBeforeDiscount, 157_000);
assert.equal(summary.totalDiscount, 5_000);
assert.equal(summary.totalRealisasi, 152_000);

// ─── Kasus 2: "Pipa listrik" — estimasi ada di item C1, realisasi di C1 DAN C2 ──
// C1 punya estimasi Pipa listrik → kolom estimasi terisi
// C2 TIDAK punya estimasi Pipa listrik → kolom estimasi KOSONG

const pipaItems: ReportItemJson[] = [
    {
        itemId: "C1",
        itemName: "Instalasi Listrik",
        categoryName: "C",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        realisasiItems: [
            {
                materialName: "Pipa listrik",
                quantity: 1,
                unit: "btg",
                price: 11_000,
                totalPrice: 11_000,
            },
        ],
    },
    {
        itemId: "C2",
        itemName: "Instalasi Tambahan",
        categoryName: "C",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        realisasiItems: [
            {
                // Dibeli lagi di item lain, harga berbeda, tidak ada estimasi
                materialName: "Pipa listrik",
                quantity: 1,
                unit: "btg",
                price: 12_000,
                totalPrice: 12_000,
            },
        ],
    },
];

const pipaEstimations: MaterialEstimationJson[] = [
    {
        itemId: "C1",
        materialName: "Pipa listrik",
        quantity: 1,
        unit: "btg",
        price: 11_000,
        totalPrice: 11_000,
    },
    // C2 TIDAK ada estimasi Pipa listrik
];

const pipaSummary = buildRealisasiDanaTaktisSummary(pipaItems, pipaEstimations);

assert.equal(pipaSummary.visibleRows.length, 2);

const [pipaC1, pipaC2] = pipaSummary.visibleRows;

// C1: ada estimasi → kolom estimasi terisi
assert.equal(pipaC1.realPrice, 11_000);
assert.equal(pipaC1.estTotal, 11_000, "C1 Pipa listrik punya estimasi");
assert.equal(pipaC1.estQty, 1);

// C2: tidak ada estimasi → kolom estimasi HARUS 0/kosong
assert.equal(pipaC2.realPrice, 12_000);
assert.equal(pipaC2.estTotal, 0, "C2 Pipa listrik TIDAK punya estimasi → 0");
assert.equal(pipaC2.estQty, 0, "C2 Pipa listrik TIDAK punya estimasi → 0");

assert.equal(
    requiresPjum(0, [{ ...items[0], realisasiItems: [] }]),
    true,
    "Rp0 dengan item pekerjaan BMS tetap wajib PJUM",
);
assert.equal(
    requiresPjum(0, [{ ...items[0], handler: "REKANAN", realisasiItems: [] }]),
    false,
    "Rp0 tanpa item pekerjaan BMS tidak wajib PJUM",
);

console.log("✅ Semua assertions passed");
