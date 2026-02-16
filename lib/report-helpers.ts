import "server-only";
import prisma from "./prisma";

/**
 * Generate ticket number format: RPT-YYYY-XXXXX
 * Auto-increment berdasarkan count report di tahun yang sama
 */
export async function generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RPT-${year}-`;

    // Hitung jumlah report di tahun ini untuk auto-increment
    const count = await prisma.report.count({
        where: {
            ticketNumber: {
                startsWith: prefix,
            },
        },
    });

    const nextNumber = (count + 1).toString().padStart(5, "0");
    return `${prefix}${nextNumber}`;
}
