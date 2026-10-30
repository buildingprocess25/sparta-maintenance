import assert from "node:assert/strict";
import {
    PREVENTIVE_SKIPPED_ACTIVITY_NOTE,
    canSkipPreventive,
    getPreventiveSkipBlocker,
    isFirstMonthOfJakartaQuarter,
} from "./preventive-skip";

// Bulan pertama tiap kuartal (WIB).
for (const iso of [
    "2026-01-15T05:00:00Z",
    "2026-04-10T05:00:00Z",
    "2026-07-20T05:00:00Z",
    "2026-10-29T05:00:00Z",
]) {
    assert.equal(isFirstMonthOfJakartaQuarter(new Date(iso)), true, iso);
}

// Bulan ke-2 dan ke-3.
for (const iso of [
    "2026-02-15T05:00:00Z",
    "2026-03-15T05:00:00Z",
    "2026-11-15T05:00:00Z",
    "2026-12-15T05:00:00Z",
]) {
    assert.equal(isFirstMonthOfJakartaQuarter(new Date(iso)), false, iso);
}

// Batas zona waktu: 31 Okt 23:59 WIB masih bulan pertama, 1 Nov 00:00 WIB bukan.
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-10-31T16:59:00Z")),
    true,
);
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-10-31T17:00:00Z")),
    false,
);
// 31 Mar 17:00 UTC = 1 Apr 00:00 WIB: bulan pertama Q2.
assert.equal(
    isFirstMonthOfJakartaQuarter(new Date("2026-03-31T17:00:00Z")),
    true,
);

const october = new Date("2026-10-29T05:00:00Z");
const november = new Date("2026-11-02T05:00:00Z");
const eligible = {
    coreCooling: false,
    now: october,
};

assert.equal(getPreventiveSkipBlocker(eligible), null);
assert.equal(canSkipPreventive(eligible), true);

assert.equal(
    getPreventiveSkipBlocker({ ...eligible, coreCooling: true }),
    "Toko sudah mengisi preventif di kuartal ini.",
);
assert.equal(
    getPreventiveSkipBlocker({ ...eligible, now: november }),
    "Lewati preventif hanya bisa di bulan pertama kuartal (Januari, April, Juli, Oktober).",
);

assert.equal(
    PREVENTIVE_SKIPPED_ACTIVITY_NOTE,
    "Preventif dilewati (bulan pertama kuartal)",
);

console.log("preventive skip tests passed");
