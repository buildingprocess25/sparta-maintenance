import assert from "node:assert/strict";
import {
    RECURRING_DAMAGE_EXCLUDED_STATUSES,
    formatRecurringDamagePeriod,
    getRecurringDamageWindow,
    isDamagedItem,
    isRecurringDamageCountedStatus,
    isValidRecurringDamagePeriod,
    normalizeRecurringDamagePeriod,
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
