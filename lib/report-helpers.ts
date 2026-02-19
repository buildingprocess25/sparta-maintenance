import "server-only";
import prisma from "./prisma";

/**
 * Ambil 4 karakter kode toko dari Store.code
 * Strip non-alphanumeric, ambil 4 char pertama uppercase
 * Contoh: "ALF-TNG-001" → "ALFT"
 */
export function extractStoreCode(storeCode?: string): string {
    if (!storeCode) return "XXXX";
    const alphanumeric = storeCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return alphanumeric.slice(0, 4).padEnd(4, "X");
}

/**
 * Generate nomor laporan format: {4digitKode}-{YYMM}-{NNN}
 * Contoh: ALFT-2502-001
 * Auto-increment per prefix {kode}-{YYMM}-
 */
export async function generateReportNumber(
    storeCode?: string,
): Promise<string> {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const kode = extractStoreCode(storeCode);
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
