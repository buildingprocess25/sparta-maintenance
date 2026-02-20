import "server-only";
import prisma from "./prisma";

export async function generateReportNumber(
    storeCode?: string,
): Promise<string> {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const kode = storeCode ? storeCode.toUpperCase() : "XXXX";
    const prefix = `${kode}-${yy}${mm}-`;

    // Ambil semua nomor laporan dengan prefix ini, cari sequence tertinggi
    const existing = await prisma.report.findMany({
        where: { reportNumber: { startsWith: prefix } },
        select: { reportNumber: true },
    });

    let maxSeq = 0;
    for (const r of existing) {
        const seq = parseInt(r.reportNumber.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    const nextNumber = (maxSeq + 1).toString().padStart(3, "0");
    return `${prefix}${nextNumber}`;
}
