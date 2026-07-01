import assert from "node:assert/strict";
import {
    formatJakartaDate,
    formatJakartaDateTime,
    getJakartaDayRange,
    getJakartaQuarterKey,
    getJakartaQuarterWindow,
    getJakartaYearWindow,
    toExcelJakartaSerial,
} from "./time";

const instant = new Date("2026-06-30T03:01:20.000Z");

assert.equal(formatJakartaDate(instant), "30 Jun 2026");
assert.equal(formatJakartaDateTime(instant), "30 Jun 2026, 10.01");
assert.equal(getJakartaDayRange("2026-07-01").start.toISOString(), "2026-06-30T17:00:00.000Z");
assert.equal(getJakartaDayRange("2026-07-01").endExclusive.toISOString(), "2026-07-01T17:00:00.000Z");
assert.equal(getJakartaYearWindow(2026).start.toISOString(), "2025-12-31T17:00:00.000Z");
assert.equal(getJakartaYearWindow(2026).endExclusive.toISOString(), "2026-12-31T17:00:00.000Z");
assert.equal(getJakartaQuarterWindow(2026, 2).start.toISOString(), "2026-03-31T17:00:00.000Z");
assert.equal(getJakartaQuarterWindow(2026, 2).endExclusive.toISOString(), "2026-06-30T17:00:00.000Z");
assert.equal(getJakartaQuarterKey(new Date("2026-06-30T16:59:59.000Z")), "q2");
assert.equal(getJakartaQuarterKey(new Date("2026-06-30T17:00:00.000Z")), "q3");
assert.equal(toExcelJakartaSerial(new Date("2026-06-30T17:00:00.000Z")), 46204);
