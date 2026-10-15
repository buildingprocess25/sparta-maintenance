import prisma from "@/lib/prisma";

/**
 * Waktu laporan (terakhir kali) masuk status APPROVED_BMC = ApprovalLog
 * terbaru berstatus APPROVED_BMC. Fallback ke updatedAt untuk laporan lama
 * yang tidak punya log tersebut.
 */
export async function getApprovedBmcEnteredAtMap(
    reports: { reportNumber: string; updatedAt: Date }[],
): Promise<Map<string, Date>> {
    if (reports.length === 0) return new Map();

    const rows = await prisma.approvalLog.groupBy({
        by: ["reportNumber"],
        where: {
            reportNumber: { in: reports.map((report) => report.reportNumber) },
            status: "APPROVED_BMC",
        },
        _max: { createdAt: true },
    });
    const loggedAt = new Map(
        rows.map((row) => [row.reportNumber, row._max.createdAt] as const),
    );

    return new Map(
        reports.map((report) => [
            report.reportNumber,
            loggedAt.get(report.reportNumber) ?? report.updatedAt,
        ]),
    );
}
