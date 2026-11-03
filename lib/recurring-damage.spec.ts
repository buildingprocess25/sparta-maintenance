import assert from "node:assert/strict";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    buildRecurringDamageStores,
    formatRecurringDamagePeriod,
    getRecurringDamageWindow,
    isDamagedItem,
    isRecurringDamageCountedStatus,
    isValidRecurringDamagePeriod,
    normalizeRecurringDamagePeriod,
    summarizeRecurringDamageBranches,
    type DamageDetection,
} from "./recurring-damage";
import {
    getJakartaMonthWindow,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
} from "./time";

// Deteksi rusak: A–H memakai `condition`, I memakai `preventiveCondition`.
assert.equal(isDamagedItem({ condition: "RUSAK", preventiveCondition: null }), true);
assert.equal(isDamagedItem({ condition: "BAIK", preventiveCondition: null }), false);
assert.equal(isDamagedItem({ condition: "TIDAK_ADA", preventiveCondition: null }), false);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "NOT_OK" }), true);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "OK" }), false);
assert.equal(isDamagedItem({ condition: null, preventiveCondition: "TIDAK_ADA" }), false);
assert.equal(isDamagedItem({}), false);

// Signage I11–I13: Pudar/Rusak tersimpan NOT_OK, Baik/Kotor tersimpan OK.
const signagePudar = { itemId: "I11", preventiveCondition: "NOT_OK", signageCondition: "PUDAR" };
const signageRusak = { itemId: "I12", preventiveCondition: "NOT_OK", signageCondition: "RUSAK" };
const signageKotor = { itemId: "I13", preventiveCondition: "OK", signageCondition: "KOTOR" };
const signageBaik = { itemId: "I13", preventiveCondition: "OK", signageCondition: "BAIK" };
assert.equal(isDamagedItem(signagePudar), true);
assert.equal(isDamagedItem(signageRusak), true);
assert.equal(isDamagedItem(signageKotor), false);
assert.equal(isDamagedItem(signageBaik), false);

// Status yang dihitung.
assert.deepEqual(
    [...RECURRING_DAMAGE_EXCLUDED_STATUSES],
    ["DRAFT", "ARCHIVED_PREVENTIVE", "ESTIMATION_REJECTED"],
);
for (const status of RECURRING_DAMAGE_EXCLUDED_STATUSES) {
    assert.equal(isRecurringDamageCountedStatus(status), false, status);
}
for (const status of [
    "PENDING_ESTIMATION",
    "PENDING_CHECKLIST_REVIEW",
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
]) {
    assert.equal(isRecurringDamageCountedStatus(status), true, status);
}

// Validasi periode: bulan hanya bila kuartal dipilih dan bulan ada di kuartal itu.
assert.equal(isValidRecurringDamagePeriod({ year: 2026 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2, month: 5 }), true);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 2, month: 7 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, month: 5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026, quarter: 5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 2026.5 }), false);
assert.equal(isValidRecurringDamagePeriod({ year: 1999 }), false);

// Normalisasi query string halaman: nilai tidak valid dibuang.
assert.deepEqual(normalizeRecurringDamagePeriod({}, 2026), { year: 2026 });
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", quarter: "3", month: "8" }, 2026),
    { year: 2025, quarter: 3, month: 8 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", quarter: "3", month: "2" }, 2026),
    { year: 2025, quarter: 3 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "2025", month: "2" }, 2026),
    { year: 2025 },
);
assert.deepEqual(
    normalizeRecurringDamagePeriod({ year: "1999", quarter: "9" }, 2026),
    { year: 2026 },
);

// Rentang waktu WIB.
assert.deepEqual(getRecurringDamageWindow({ year: 2026 }), getJakartaYearWindow(2026));
assert.deepEqual(
    getRecurringDamageWindow({ year: 2026, quarter: 2 }),
    getJakartaQuarterWindow(2026, 2),
);
assert.deepEqual(
    getRecurringDamageWindow({ year: 2026, quarter: 2, month: 5 }),
    getJakartaMonthWindow(2026, 5),
);

// Label periode.
assert.equal(formatRecurringDamagePeriod({ year: 2026 }), "Tahun 2026");
assert.equal(formatRecurringDamagePeriod({ year: 2026, quarter: 2 }), "Triwulan 2 2026");
assert.equal(formatRecurringDamagePeriod({ year: 2026, quarter: 2, month: 5 }), "Mei 2026");

// ── Agregasi ──────────────────────────────────────────────────────────────
const baseDetection: DamageDetection = {
    branchName: "CIANJUR",
    storeCode: "T001",
    storeName: "Toko Satu",
    reportNumber: "R-1",
    createdAt: "2026-02-01T03:00:00.000Z",
    status: "COMPLETED",
    itemId: "A5",
    condition: "RUSAK",
    preventiveCondition: null,
    handler: "BMS",
    notes: null,
    signageCondition: null,
    signageMaterial: null,
};
const detection = (overrides: Partial<DamageDetection>): DamageDetection => ({
    ...baseDetection,
    ...overrides,
});

// Rusak 1x bukan berulang.
assert.deepEqual(buildRecurringDamageStores([detection({})]), []);

// Item yang sama dua kali di satu laporan tetap 1 deteksi.
assert.deepEqual(buildRecurringDamageStores([detection({}), detection({})]), []);

// Status dikecualikan dan item tidak rusak diabaikan.
assert.deepEqual(
    buildRecurringDamageStores([
        detection({}),
        detection({ reportNumber: "R-2", status: "ESTIMATION_REJECTED" }),
        detection({ reportNumber: "R-3", status: "DRAFT" }),
        detection({ reportNumber: "R-4", status: "ARCHIVED_PREVENTIVE" }),
        detection({ reportNumber: "R-5", condition: "BAIK" }),
    ]),
    [],
);

// TX: A5 4x (input sengaja terbalik untuk menguji urutan tanggal).
// TZ: A2 3x dan A1 3x (seri → A1 jadi item teratas).
// TY: A5, B3, D1 masing-masing 2x, E1 1x (tidak tampil).
// TV: A6 2x, TW: A5 2x (seri penuh → urut kode toko).
const detections: DamageDetection[] = [
    ...["R-4", "R-3", "R-2", "R-1"].map((reportNumber, index) =>
        detection({
            storeCode: "TX",
            storeName: "Toko X",
            reportNumber,
            createdAt: `2026-0${4 - index}-01T03:00:00.000Z`,
            handler: index === 0 ? "REKANAN" : "BMS",
        }),
    ),
    ...["A2", "A1"].flatMap((itemId) =>
        ["R-20", "R-21", "R-22"].map((reportNumber) =>
            detection({
                branchName: "BOGOR",
                storeCode: "TZ",
                storeName: "Toko Z",
                itemId,
                reportNumber,
            }),
        ),
    ),
    ...["A5", "B3", "D1"].flatMap((itemId) =>
        ["R-10", "R-11"].map((reportNumber) =>
            detection({ storeCode: "TY", storeName: "Toko Y", itemId, reportNumber }),
        ),
    ),
    detection({ storeCode: "TY", storeName: "Toko Y", itemId: "E1", reportNumber: "R-12" }),
    ...["R-30", "R-31"].map((reportNumber) =>
        detection({ storeCode: "TW", storeName: "Toko W", reportNumber }),
    ),
    ...["R-40", "R-41"].map((reportNumber) =>
        detection({ storeCode: "TV", storeName: "Toko V", itemId: "A6", reportNumber }),
    ),
];

const stores = buildRecurringDamageStores(detections);

assert.deepEqual(
    stores.map((store) => [
        store.storeCode,
        store.maxFrequency,
        store.recurringItemCount,
        store.topItemId,
    ]),
    [
        ["TX", 4, 1, "A5"],
        ["TZ", 3, 2, "A1"],
        ["TY", 2, 3, "A5"],
        ["TV", 2, 1, "A6"],
        ["TW", 2, 1, "A5"],
    ],
);

const storeX = stores[0];
assert.equal(storeX.branchName, "CIANJUR");
assert.equal(storeX.storeName, "Toko X");
assert.equal(storeX.topItemName, "Lampu Shop Sign");
assert.equal(storeX.items[0].itemName, "Lampu Shop Sign");
assert.equal(storeX.items[0].categoryName, "A. Bagian Depan Bangunan");
assert.equal(storeX.items[0].count, 4);
assert.deepEqual(
    storeX.items[0].detections.map((item) => item.reportNumber),
    ["R-1", "R-2", "R-3", "R-4"],
);
assert.equal(storeX.items[0].detections[3].handler, "REKANAN");

assert.deepEqual(
    stores[1].items.map((item) => [item.itemId, item.count]),
    [
        ["A1", 3],
        ["A2", 3],
    ],
);
assert.deepEqual(
    stores[2].items.map((item) => item.itemId),
    ["A5", "B3", "D1"],
);

// Ringkasan cabang: urut jumlah toko problematik turun, lalu nama cabang.
assert.deepEqual(
    summarizeRecurringDamageBranches(["SUKABUMI", "BOGOR", "CIANJUR"], stores),
    [
        { branchName: "CIANJUR", problematicStoreCount: 4 },
        { branchName: "BOGOR", problematicStoreCount: 1 },
        { branchName: "SUKABUMI", problematicStoreCount: 0 },
    ],
);
