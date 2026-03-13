import "server-only";
import prisma from "./prisma";
import { Prisma, PrismaClient } from "@prisma/client";

export type PrismaTx = Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Generate a unique, sequential report number atomically.
 * Format: `{STORE_CODE}-{YYMM}-{SEQ}` (e.g. `ALF1-2602-001`)
 *
 * It accepts an optional Prisma Transaction client to ensure the lock
 * is held until the caller commits the full transaction.
 */
export async function generateReportNumber(
    storeCode?: string,
    tx?: PrismaTx | PrismaClient,
): Promise<string> {
    const { yy, mm } = getJakartaYearMonth(new Date());
    const kode = storeCode ? storeCode.toUpperCase() : "XXXX";
    const prefix = `${kode}-${yy}${mm}-`;

    const lockKey = hashCode(prefix);

    const executeOperation = async (client: PrismaTx | PrismaClient) => {
        await client.$executeRawUnsafe(
            `SELECT pg_advisory_xact_lock($1)`,
            lockKey,
        );

        // Find the current max sequence number in one query.
        const result = await client.$queryRaw<{ max_seq: number | null }[]>(
            Prisma.sql`
                SELECT MAX(
                    CAST(SUBSTR("reportNumber", ${prefix.length + 1}) AS INTEGER)
                ) AS max_seq
                FROM "Report"
                WHERE "reportNumber" LIKE ${prefix + "%"}
            `,
        );

        const maxSeq = result[0]?.max_seq ?? 0;
        const nextNumber = (maxSeq + 1).toString().padStart(3, "0");

        return `${prefix}${nextNumber}`;
    };

    if (tx) {
        return executeOperation(tx);
    } else {
        return prisma.$transaction((t) => executeOperation(t));
    }
}

function getJakartaYearMonth(date: Date): { yy: string; mm: string } {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "2-digit",
        month: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const yy = parts.find((part) => part.type === "year")?.value;
    const mm = parts.find((part) => part.type === "month")?.value;

    if (!yy || !mm) {
        throw new Error(
            "Failed to compute Jakarta year-month for report number",
        );
    }

    return { yy, mm };
}

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
}
