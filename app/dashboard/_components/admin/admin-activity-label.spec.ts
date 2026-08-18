import assert from "node:assert/strict";
import { getAdminRecentActivityLabel } from "./admin-activity-label";

assert.equal(
  getAdminRecentActivityLabel({
    action: "ESTIMATION_APPROVED",
    isChecklistOnly: true,
  }),
  "Checklist disetujui",
);

assert.equal(
  getAdminRecentActivityLabel({
    action: "ESTIMATION_APPROVED",
    isChecklistOnly: false,
  }),
  "Estimasi disetujui",
);

assert.equal(
  getAdminRecentActivityLabel({
    action: "ESTIMATION_REJECTED_REVISION",
    isChecklistOnly: true,
  }),
  "Checklist perlu direvisi",
);

console.log("admin recent activity label tests passed");
