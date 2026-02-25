import "server-only";
import prisma from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * Generate a unique, sequential report number atomically.
 * Format: `{STORE_CODE}-{YYMM}-{SEQ}` (e.g. `ALF1-2602-001`)
 */
export async function generateReportNumber(
    storeCode?: string,
): Promise<string> {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const kode = storeCode ? storeCode.toUpperCase() : "XXXX";
    const prefix = `${kode}-${yy}${mm}-`;

    const lockKey = hashCode(prefix);

    return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockKey);

        // Find the current max sequence number in one query.
        const result = await tx.$queryRaw<{ max_seq: number | null }[]>(
            Prisma.sql`
                SELECT MAX(
                    CAST(SUBSTRING("reportNumber" FROM ${prefix.length + 1}) AS INTEGER)
                ) AS max_seq
                FROM "Report"
                WHERE "reportNumber" LIKE ${prefix + "%"}
            `,
        );

        const maxSeq = result[0]?.max_seq ?? 0;
        const nextNumber = (maxSeq + 1).toString().padStart(3, "0");

        return `${prefix}${nextNumber}`;
    });
}

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
}
