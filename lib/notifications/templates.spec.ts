import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import { buildNotificationTemplate } from "./templates";

const report = {
    reportNumber: "U845-2606-001",
    storeCode: "U845",
    storeName: "KPG. TIMOR RAYA KM10",
    branchName: "SIDOARJO",
    createdByNIK: "24115397",
};

const bmcTemplate = buildNotificationTemplate({
    type: "REPORT_SUBMITTED",
    actorNIK: "24115397",
    recipientRole: UserRole.BMC,
    report,
});

assert.equal(bmcTemplate.href, "/dashboard/reports/U845-2606-001");
assert.equal(bmcTemplate.entityType, "REPORT");
assert.equal(bmcTemplate.entityId, "U845-2606-001");
assert.match(bmcTemplate.title, /menunggu review estimasi/i);

const bmsTemplate = buildNotificationTemplate({
    type: "REPORT_ESTIMATION_APPROVED",
    actorNIK: "BMC001",
    recipientRole: UserRole.BMS,
    report,
});

assert.equal(bmsTemplate.href, "/reports/U845-2606-001");
assert.match(bmsTemplate.body, /boleh mulai pekerjaan/i);

const workStartedTemplate = buildNotificationTemplate({
    type: "REPORT_WORK_STARTED",
    actorNIK: "24115397",
    recipientRole: UserRole.BMC,
    report,
});

assert.equal(workStartedTemplate.href, "/dashboard/reports/U845-2606-001");
assert.match(workStartedTemplate.title, /pekerjaan dimulai/i);

const pjumTemplate = buildNotificationTemplate({
    type: "PJUM_CREATED",
    actorNIK: "BMC001",
    recipientRole: UserRole.BNM_MANAGER,
    pjum: {
        id: "4a3c3d57-5555-4444-9999-111111111111",
        bmsNIK: "24115397",
        branchName: "SIDOARJO",
        weekNumber: 4,
        reportNumbers: ["U845-2606-001", "U845-2606-002"],
    },
});

assert.equal(
    pjumTemplate.href,
    "/dashboard/pjum/4a3c3d57-5555-4444-9999-111111111111",
);
assert.match(pjumTemplate.body, /2 laporan/i);

const bmsPjumTemplate = buildNotificationTemplate({
    type: "PJUM_APPROVED",
    actorNIK: "BNM001",
    recipientRole: UserRole.BMS,
    pjum: {
        id: "4a3c3d57-5555-4444-9999-111111111111",
        bmsNIK: "24115397",
        branchName: "SIDOARJO",
        weekNumber: 4,
        reportNumbers: ["U845-2606-001"],
    },
});

assert.equal(
    bmsPjumTemplate.href,
    "/reports/pjum/4a3c3d57-5555-4444-9999-111111111111",
);

console.log("notification template tests passed");
