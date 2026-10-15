import assert from "node:assert/strict";
import {
    BNM_REVIEW_DEFAULT_SLA_DAYS,
    findOverdueBnmReport,
    formatBnmReviewDeadline,
    getBnmReviewDeadline,
    getBnmReviewState,
} from "./bnm-review-deadline";

// Rabu 14 Okt 2026 10:00 WIB → batas Kamis 15 Okt 23:59 (deadline eksklusif Jumat 00:00 WIB)
const enteredAt = new Date("2026-10-14T10:00:00+07:00");

assert.equal(BNM_REVIEW_DEFAULT_SLA_DAYS, 1);
assert.equal(
    getBnmReviewDeadline(enteredAt, 1).toISOString(),
    new Date("2026-10-16T00:00:00+07:00").toISOString(),
);
assert.equal(
    getBnmReviewDeadline(enteredAt, 2).toISOString(),
    new Date("2026-10-17T00:00:00+07:00").toISOString(),
);

// Zona waktu: 2026-10-14T20:00Z = Kamis 15 Okt 03:00 WIB → hari WIB = 15, bukan 14
assert.equal(
    getBnmReviewDeadline(new Date("2026-10-14T20:00:00Z"), 1).toISOString(),
    new Date("2026-10-17T00:00:00+07:00").toISOString(),
);

const stateAt = (iso: string) =>
    getBnmReviewState({ enteredAt, slaDays: 1, now: new Date(iso) });

assert.equal(stateAt("2026-10-14T10:00:00+07:00"), "ON_TIME");
assert.equal(stateAt("2026-10-15T09:59:59+07:00"), "ON_TIME");
assert.equal(stateAt("2026-10-15T10:00:01+07:00"), "WARNING");
assert.equal(stateAt("2026-10-15T23:59:59.999+07:00"), "WARNING");
assert.equal(stateAt("2026-10-16T00:00:00+07:00"), "OVERDUE");
assert.equal(stateAt("2026-10-18T12:00:00+07:00"), "OVERDUE");

// Masuk 23:59 WIB: tetap ada >24 jam sebelum overdue (WARNING selalu mendahului OVERDUE)
const lateEntry = new Date("2026-10-14T23:59:00+07:00");
assert.equal(
    getBnmReviewState({
        enteredAt: lateEntry,
        slaDays: 1,
        now: new Date("2026-10-15T23:59:30+07:00"),
    }),
    "WARNING",
);

const label = formatBnmReviewDeadline(getBnmReviewDeadline(enteredAt, 1));
assert.match(label, /Kamis/);
assert.match(label, /15/);
assert.match(label, /2026/);
assert.match(label, /23:59 WIB$/);

const candidates = [
    { reportNumber: "A", enteredAt: new Date("2026-10-14T10:00:00+07:00") },
    { reportNumber: "B", enteredAt: new Date("2026-10-13T09:00:00+07:00") },
    { reportNumber: "C", enteredAt: new Date("2026-10-15T09:00:00+07:00") },
];
const now = new Date("2026-10-16T08:00:00+07:00");
const overdue = findOverdueBnmReport(candidates, 1, now);
assert.equal(overdue?.reportNumber, "B"); // batas B = Rabu 23:59, paling awal
assert.equal(
    overdue?.deadlineAt.toISOString(),
    new Date("2026-10-15T00:00:00+07:00").toISOString(),
);
assert.equal(
    findOverdueBnmReport(candidates, 1, new Date("2026-10-13T12:00:00+07:00")),
    null,
);
assert.equal(findOverdueBnmReport([], 1, now), null);

console.log("bnm-review-deadline.spec OK");
