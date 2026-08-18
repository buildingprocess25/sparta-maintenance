import assert from "node:assert/strict";
import {
  getReportActivityActionLabel,
  REVIEW_ACTIVITY_FILTER_OPTIONS,
} from "./report-activity-label";

assert.equal(
  getReportActivityActionLabel("ESTIMATION_APPROVED", true),
  "Checklist disetujui",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED_REVISION", true),
  "Checklist perlu direvisi",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED", true), "Checklist ditolak");

assert.equal(
  getReportActivityActionLabel("ESTIMATION_APPROVED", false),
  "Estimasi disetujui",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED_REVISION", false),
  "Estimasi ditolak revisi",
);
assert.equal(
  getReportActivityActionLabel("ESTIMATION_REJECTED", false), "Estimasi ditolak");

assert.equal(
  getReportActivityActionLabel("FINAL_APPROVED_BNM", true),
  "Disetujui final BNM",
);
assert.equal(getReportActivityActionLabel("UNKNOWN_ACTION", true), "UNKNOWN_ACTION");

assert.deepEqual(REVIEW_ACTIVITY_FILTER_OPTIONS, [
  { value: "ESTIMATION_APPROVED", label: "Review disetujui" },
  {
    value: "ESTIMATION_REJECTED_REVISION",
    label: "Review perlu direvisi",
  },
  { value: "ESTIMATION_REJECTED", label: "Review ditolak" },
]);

console.log("report activity label tests passed");
