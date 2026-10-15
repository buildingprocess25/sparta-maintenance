import assert from "node:assert/strict";
import { ReportStatus } from "@prisma/client";
import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    BMS_ACTIVE_REPORT_BLOCKING_STATUSES,
    buildBmsActiveReportBlockerWhere,
    formatBmsActiveReportBlockerMessage,
    formatBmsActiveReportBlockerTitle,
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
assert(!blockingStatuses.includes(ReportStatus.APPROVED_BMC));
assert(blockingStatuses.includes(ReportStatus.REVIEW_REJECTED_REVISION));
assert(blockingStatuses.includes(ReportStatus.PENDING_CHECKLIST_REVIEW));
assert.equal(blockingStatuses.length, 7);

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
    "Anda bisa membuat laporan baru setelah laporan AH01-2609-002 disetujui BMC dan masuk tahap Review BNM. Status saat ini: Review BMC.",
);

assert.equal(
    formatBmsActiveReportBlockerTitle({ kind: "ACTIVE_REPORT" }),
    "Laporan aktif belum selesai",
);
assert.equal(
    formatBmsActiveReportBlockerTitle({ kind: "BNM_REVIEW_OVERDUE" }),
    "Laporan baru diblokir",
);

const overdueMessage = formatBmsActiveReportBlockerMessage({
    reportNumber: "AH01-2609-003",
    status: ReportStatus.APPROVED_BMC,
    kind: "BNM_REVIEW_OVERDUE",
    bnmDeadlineAt: new Date("2026-10-16T00:00:00+07:00"),
});
assert.match(overdueMessage, /AH01-2609-003 belum disetujui BNM/);
assert.match(overdueMessage, /melewati batas waktu review/);
assert.match(overdueMessage, /Kamis/);
assert.match(overdueMessage, /23:59 WIB/);

assert.match(
    formatBmsActiveReportBlockerMessage({
        reportNumber: "AH01-2609-004",
        status: ReportStatus.APPROVED_BMC,
        kind: "BNM_REVIEW_OVERDUE",
    }),
    /^Laporan AH01-2609-004 belum disetujui BNM dan melewati batas waktu review\./,
);

console.log("bms-active-report-blocker.spec OK");
