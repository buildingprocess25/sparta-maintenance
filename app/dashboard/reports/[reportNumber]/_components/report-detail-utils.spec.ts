import assert from "node:assert/strict";

import { formatActivityAction } from "./report-detail-utils";

assert.equal(
    formatActivityAction("ESTIMATION_APPROVED", true),
    "Checklist disetujui",
);
assert.equal(
    formatActivityAction("ESTIMATION_APPROVED", false),
    "Estimasi disetujui",
);
assert.equal(
    formatActivityAction("ESTIMATION_APPROVED"),
    "Estimasi disetujui",
);

console.log("report detail activity formatter tests passed");
