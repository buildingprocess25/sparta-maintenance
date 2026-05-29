import assert from "node:assert/strict";
import { getActivityPeriodWindow } from "./admin-activity-period";

const now = new Date("2026-05-29T10:30:00.000Z");

const ytd = getActivityPeriodWindow("ytd", now);
assert.equal(ytd.start.getFullYear(), 2026);
assert.equal(ytd.start.getMonth(), 0);
assert.equal(ytd.start.getDate(), 1);
assert.equal(ytd.end, undefined);

const fallback = getActivityPeriodWindow(undefined, now);
assert.equal(fallback.start.getFullYear(), 2026);
assert.equal(fallback.start.getMonth(), 0);
assert.equal(fallback.start.getDate(), 1);
assert.equal(fallback.end, undefined);

const month = getActivityPeriodWindow("05-2026", now);
assert.equal(month.start.getFullYear(), 2026);
assert.equal(month.start.getMonth(), 4);
assert.equal(month.start.getDate(), 1);
assert.equal(month.end?.getFullYear(), 2026);
assert.equal(month.end?.getMonth(), 5);
assert.equal(month.end?.getDate(), 1);

const invalidMonth = getActivityPeriodWindow("13-2026", now);
assert.equal(invalidMonth.start.getFullYear(), 2026);
assert.equal(invalidMonth.start.getMonth(), 0);
assert.equal(invalidMonth.start.getDate(), 1);
assert.equal(invalidMonth.end, undefined);
