import prisma from "../lib/prisma";
import { summarizeBmsCutoverAudit } from "../lib/bms-cutover-audit";
import { BMS_ACTIVE_REPORT_BLOCKER_CUTOVER } from "../lib/bms-active-report-blocker";
import {
    BMS_INITIAL_HANGING_REPORT_CUTOVER,
    isInitialHangingReportCandidate,
} from "../lib/bms-balance-cutover-policy";

async function main() {
    const [bmsUsers, runningPeriods, pendingPjums] = await Promise.all([
        prisma.user.findMany({
            where: { role: "BMS", deletedAt: null },
            select: { NIK: true },
        }),
        prisma.bmsBalancePeriod.findMany({
            where: { status: { in: ["ACTIVE", "LOCKED_PJUM"] } },
            select: { bmsNIK: true, status: true, pjumExportId: true },
        }),
        prisma.pjumExport.findMany({
            where: { status: "PENDING_APPROVAL" },
            select: { id: true, bmsNIK: true },
        }),
    ]);

    const activeBmsNiks = bmsUsers.map((user) => user.NIK);
    const unlinkedOpenReportCount = await prisma.report.count({
        where: {
            createdByNIK: { in: activeBmsNiks },
            status: { not: "COMPLETED" },
            balancePeriodId: null,
            createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER },
        },
    });

    const initialHangingCandidates = (
        await prisma.report.findMany({
            where: {
                createdByNIK: { in: activeBmsNiks },
                status: "COMPLETED",
                pjumExportedAt: null,
                pjumHangingAt: null,
                pjumExpiredAt: null,
                balancePeriodId: null,
                totalReal: { gt: 0 },
                finishedAt: { gte: BMS_INITIAL_HANGING_REPORT_CUTOVER },
            },
            select: {
                reportNumber: true,
                status: true,
                finishedAt: true,
                pjumExportedAt: true,
                pjumHangingAt: true,
                pjumExpiredAt: true,
                totalReal: true,
            },
        })
    ).filter((report) => isInitialHangingReportCandidate(report));

    const initialHangingCandidateTotal = initialHangingCandidates.reduce(
        (sum, report) => sum + Number(report.totalReal ?? 0),
        0,
    );

    const summary = summarizeBmsCutoverAudit({
        activeBmsNiks,
        runningPeriods: runningPeriods.map((period) => ({
            ...period,
            status: period.status as "ACTIVE" | "LOCKED_PJUM",
        })),
        pendingPjums,
        unlinkedOpenReportCount,
    });

    console.log(
        JSON.stringify(
            {
                ...summary,
                activeReportBlockerCutover:
                    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER.toISOString(),
                initialHangingReportCutover:
                    BMS_INITIAL_HANGING_REPORT_CUTOVER.toISOString(),
                initialHangingCandidateCount:
                    initialHangingCandidates.length,
                initialHangingCandidateTotal,
            },
            null,
            2,
        ),
    );

    if (process.argv.includes("--strict") && !summary.isSafeToCutover) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error("BMS balance cutover audit failed", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
