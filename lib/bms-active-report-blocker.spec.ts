import assert from "node:assert/strict";
import { ReportStatus } from "@prisma/client";
import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    BMS_ACTIVE_REPORT_BLOCKING_STATUSES,
    buildBmsActiveReportBlockerWhere,
    formatBmsActiveReportBlockerMessage,
} from "./bms-active-report-blocker";

const blockingStatuses: readonly ReportStatus[] =
    BMS_ACTIVE_REPORT_BLOCKING_STATUSES;

assert(blockingStatuses.includes(ReportStatus.IN_PROGRESS));
assert(!blockingStatuses.includes(ReportStatus.COMPLETED));
assert(
    !blockingStatuses.includes(ReportStatus.ESTIMATION_REJECTED),
);
assert(
    !blockingStatuses.includes(ReportStatus.ARCHIVED_PREVENTIVE),
);

const where = buildBmsActiveReportBlockerWhere({
    bmsNIK: "12345678",
    activePeriodId: "period-1",
    excludeReportNumber: "AH01-2609-001",
});

assert.equal(where.createdByNIK, "12345678");
assert.deepEqual(where.reportNumber, { not: "AH01-2609-001" });
assert.deepEqual(where.status, {
    in: BMS_ACTIVE_REPORT_BLOCKING_STATUSES,
});
assert.deepEqual(where.OR, [
    { balancePeriodId: "period-1" },
    {
        balancePeriodId: null,
        createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER },
    },
]);

assert.equal(
    formatBmsActiveReportBlockerMessage({
        reportNumber: "AH01-2609-002",
        status: ReportStatus.PENDING_REVIEW,
    }),
    "Anda bisa membuat laporan baru setelah laporan AH01-2609-002 berstatus Selesai. Status saat ini: Review BMC.",
);
