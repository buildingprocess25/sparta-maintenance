import assert from "node:assert/strict";
import {
    formatJakartaQuarterLabel,
    toSignageExportRows,
    type SignageExportReport,
} from "./signage-export";

const createdAt = new Date("2026-10-28T03:00:00.000Z");

const baseReport: Omit<SignageExportReport, "items"> = {
    reportNumber: "RPT-001",
    createdAt,
    branchName: "BRANCH A",
    brand: "ALFAMART",
    storeCode: "T001",
    storeName: "Toko Satu",
    bmsNIK: "1001",
    bmsName: "Budi",
    status: "COMPLETED",
};

// Kuartal WIB
assert.equal(formatJakartaQuarterLabel(createdAt), "2026-Q4");
// 2026-12-31 17:30 UTC = 2027-01-01 00:30 WIB
assert.equal(
    formatJakartaQuarterLabel(new Date("2026-12-31T17:30:00.000Z")),
    "2027-Q1",
);

// Satu baris per item signage, urut I11 → I13, item non-signage diabaikan
const rows = toSignageExportRows({
    ...baseReport,
    items: [
        {
            itemId: "A1",
            condition: "BAIK",
            preventiveCondition: null,
            handler: null,
        },
        {
            itemId: "I13",
            preventiveCondition: "TIDAK_ADA",
            condition: "TIDAK_ADA",
            handler: null,
        },
        {
            itemId: "I12",
            preventiveCondition: "NOT_OK",
            condition: "RUSAK",
            handler: "REKANAN",
            signageMaterial: "ACP/Alucopan",
            signageCondition: "PUDAR",
            notes: "Warna hilang, rekondisi ke GS",
            ahoTicketNumber: "AHO-77",
        },
        {
            itemId: "I11",
            preventiveCondition: "OK",
            condition: "BAIK",
            handler: null,
            signageMaterial: "Acrylic",
            signageCondition: "KOTOR",
            notes: "Kusam, rekomendasi cleaning",
        },
    ],
});

const sharedColumns = {
    reportNumber: "RPT-001",
    createdAt,
    quarter: "2026-Q4",
    branchName: "BRANCH A",
    brand: "ALFAMART",
    storeCode: "T001",
    storeName: "Toko Satu",
    bmsNIK: "1001",
    bmsName: "Budi",
    status: "COMPLETED",
};

assert.deepEqual(rows, [
    {
        ...sharedColumns,
        itemId: "I11",
        itemName: "Kondisi Fisik Shop Sign",
        material: "Acrylic",
        condition: "Kotor",
        notes: "Kusam, rekomendasi cleaning",
        ahoTicketNumber: "",
    },
    {
        ...sharedColumns,
        itemId: "I12",
        itemName: "Kondisi Fisik List Plank",
        material: "ACP/Alucopan",
        condition: "Pudar",
        notes: "Warna hilang, rekondisi ke GS",
        ahoTicketNumber: "AHO-77",
    },
    {
        ...sharedColumns,
        itemId: "I13",
        itemName: "Kondisi Fisik Pole Sign",
        material: "-",
        condition: "Tidak Ada",
        notes: "",
        ahoTicketNumber: "",
    },
]);

// Laporan tanpa item signage → kosong
assert.deepEqual(
    toSignageExportRows({
        ...baseReport,
        items: [
            {
                itemId: "A1",
                condition: "RUSAK",
                preventiveCondition: null,
                handler: "BMS",
            },
        ],
    }),
    [],
);

// items bukan array → kosong
assert.deepEqual(toSignageExportRows({ ...baseReport, items: null }), []);

// Item signage tanpa kondisi preventif tidak diekspor
assert.deepEqual(
    toSignageExportRows({
        ...baseReport,
        items: [
            {
                itemId: "I11",
                condition: null,
                preventiveCondition: null,
                handler: null,
            },
        ],
    }),
    [],
);

console.log("signage export tests passed");
