/**
 * Backfill Report.totalReal from Report.items.realisasiItems.
 *
 * Usage:
 *   npx tsx scripts/backfill-total-real.ts --dry-run
 *   npx tsx scripts/backfill-total-real.ts
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
    calculateTotalRealisasiFromItems,
    hasRealisasiItems,
} from "@/lib/realisasi";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;
const EPSILON = 0.0001;

type PrismaColumnError = {
    code?: string;
    message?: string;
    meta?: {
        column?: string;
        driverAdapterError?: {
            cause?: {
                originalMessage?: string;
            };
        };
    };
};

function log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function isMissingTotalRealColumn(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const candidate = error as PrismaColumnError;
    if (candidate.code !== "P2022") return false;

    const originalMessage =
        candidate.meta?.driverAdapterError?.cause?.originalMessage ?? "";
    const combined = `${candidate.message ?? ""} ${candidate.meta?.column ?? ""} ${originalMessage}`;

    return /totalReal/i.test(combined);
}

function isDifferent(current: number | null, next: number): boolean {
    if (current === null) return true;
    return Math.abs(current - next) > EPSILON;
}

async function main() {
    log(`Starting backfill totalReal (${DRY_RUN ? "DRY RUN" : "LIVE"})`);

    let cursor: string | undefined;
    let scanned = 0;
    let withRealisasi = 0;
    let candidates = 0;
    let updated = 0;
    let failed = 0;

    while (true) {
        let reports;
        try {
            reports = await prisma.report.findMany({
                take: BATCH_SIZE,
                ...(cursor
                    ? {
                          skip: 1,
                          cursor: { reportNumber: cursor },
                      }
                    : {}),
                orderBy: { reportNumber: "asc" },
                select: {
                    reportNumber: true,
                    items: true,
                    totalReal: true,
                },
            });
        } catch (error) {
            if (isMissingTotalRealColumn(error)) {
                throw new Error(
                    "Kolom totalReal belum tersedia. Jalankan migration terlebih dahulu, lalu ulangi script backfill.",
                );
            }
            throw error;
        }

        if (reports.length === 0) break;

        for (const report of reports) {
            scanned += 1;

            if (!hasRealisasiItems(report.items)) {
                continue;
            }

            withRealisasi += 1;
            const computed = calculateTotalRealisasiFromItems(report.items);
            const current = report.totalReal
                ? report.totalReal.toNumber()
                : null;

            if (!isDifferent(current, computed)) {
                continue;
            }

            candidates += 1;

            if (DRY_RUN) {
                continue;
            }

            try {
                await prisma.report.update({
                    where: { reportNumber: report.reportNumber },
                    data: {
                        totalReal: new Prisma.Decimal(computed),
                    },
                });
                updated += 1;
            } catch (error) {
                failed += 1;
                console.error(
                    `[${new Date().toISOString()}] Failed updating ${report.reportNumber}:`,
                    error,
                );
            }
        }

        cursor = reports[reports.length - 1]?.reportNumber;

        log(
            `Progress scanned=${scanned} withRealisasi=${withRealisasi} candidates=${candidates} updated=${updated} failed=${failed}`,
        );

        if (reports.length < BATCH_SIZE) {
            break;
        }
    }

    log("Backfill complete");
    log(`Scanned rows        : ${scanned}`);
    log(`Rows with realisasi : ${withRealisasi}`);
    log(`Candidate updates   : ${candidates}`);
    log(`Rows updated        : ${updated}`);
    log(`Rows failed         : ${failed}`);

    if (DRY_RUN) {
        log("Dry run mode: no rows were updated.");
    }

    if (failed > 0) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error("Backfill failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
