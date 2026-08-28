import prisma from "../lib/prisma";
import { summarizeBmsCutoverAudit } from "../lib/bms-cutover-audit";

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
        },
    });

    const summary = summarizeBmsCutoverAudit({
        activeBmsNiks,
        runningPeriods: runningPeriods.map((period) => ({
            ...period,
            status: period.status as "ACTIVE" | "LOCKED_PJUM",
        })),
        pendingPjums,
        unlinkedOpenReportCount,
    });

    console.log(JSON.stringify(summary, null, 2));

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
