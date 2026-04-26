import "dotenv/config";

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deletePhotoFromDriveCdn } from "@/lib/storage/drive-photo-service";

type ScriptOptions = {
    dryRun: boolean;
};

type CleanupProgress = {
    totalReports: number;
    processedReports: number;
    totalDriveFiles: number;
    processedDriveFiles: number;
};

type RunSummary = {
    reportsProcessed: number;
    driveFilesDeleted: number;
    driveFilesPlanned: number;
    driveDeletionFailures: number;
    utKeysProcessed: number;
    utKeysDeleted: number;
    utDeletionFailures: number;
};

const OPERATION = "scripts.cleanupApprovedPjumPhotos";
const OUTPUT_FILE = join(process.cwd(), "cleanup-output.txt");
const PROGRESS_BAR_WIDTH = 20;

function parseOptions(): ScriptOptions {
    const args = new Set(process.argv.slice(2));
    const dryRun = args.has("--dry-run") || !args.has("--execute");
    return { dryRun };
}

function annotateDryRun(message: string, dryRun: boolean): string {
    return dryRun ? `${message} (dry-run)` : message;
}

function buildProgressBar(
    current: number,
    total: number,
): {
    bar: string;
    percent: number;
} {
    const safeTotal = total > 0 ? total : 1;
    const boundedCurrent = Math.max(0, Math.min(current, safeTotal));
    const percent = Math.min(100, (boundedCurrent / safeTotal) * 100);
    const filled = Math.round((percent / 100) * PROGRESS_BAR_WIDTH);
    const bar = `${"=".repeat(filled)}${"-".repeat(PROGRESS_BAR_WIDTH - filled)}`;
    return { bar, percent };
}

function renderProgress(
    progress: CleanupProgress,
    options: ScriptOptions,
): void {
    if (!process.stdout.isTTY) return;

    const report = buildProgressBar(
        progress.processedReports,
        progress.totalReports,
    );
    const drive = buildProgressBar(
        progress.processedDriveFiles,
        progress.totalDriveFiles,
    );
    const mode = options.dryRun ? "DRY RUN" : "EXECUTE";

    process.stdout.write(
        `\r[${mode}] Report [${report.bar}] ${report.percent.toFixed(1)}% (${progress.processedReports}/${progress.totalReports}) | Drive [${drive.bar}] ${drive.percent.toFixed(1)}% (${progress.processedDriveFiles}/${progress.totalDriveFiles})`,
    );
}

function finishProgress(
    progress: CleanupProgress,
    options: ScriptOptions,
): void {
    if (!process.stdout.isTTY) return;
    renderProgress(progress, options);
    process.stdout.write("\n");
}

function toArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
    );
}

async function processReport(
    reportNumber: string,
    driveFileIds: string[],
    uploadthingKeys: string[],
    utapi: UTApi,
    summary: RunSummary,
    options: ScriptOptions,
): Promise<string[]> {
    const reportLines: string[] = [];
    reportLines.push(`Report: ${reportNumber}`);

    // ── Process Drive CDN files ───────────────────────────────────────────
    const driveResults: string[] = [];
    let driveDeletedCount = 0;
    let driveFailedCount = 0;

    if (driveFileIds.length > 0) {
        reportLines.push(`  Drive files: ${driveFileIds.length}`);

        for (const fileId of driveFileIds) {
            if (options.dryRun) {
                driveResults.push(`    [${fileId}] - akan dihapus`);
                driveDeletedCount++;
                summary.driveFilesPlanned++;
            } else {
                const deleted = await deletePhotoFromDriveCdn(fileId);
                if (deleted) {
                    driveResults.push(`    [${fileId}] - berhasil dihapus`);
                    driveDeletedCount++;
                    summary.driveFilesDeleted++;
                } else {
                    driveResults.push(`    [${fileId}] - gagal dihapus`);
                    driveFailedCount++;
                    summary.driveDeletionFailures++;
                }
            }
        }
    } else {
        reportLines.push(`  Drive files: 0 (tidak ada)`);
    }

    reportLines.push(...driveResults);

    // ── Process UploadThing keys (legacy) ─────────────────────────────────
    const utResults: string[] = [];
    let utDeletedCount = 0;
    let utFailedCount = 0;

    if (uploadthingKeys.length > 0) {
        reportLines.push(`  UploadThing keys: ${uploadthingKeys.length}`);

        for (const key of uploadthingKeys) {
            summary.utKeysProcessed++;

            if (options.dryRun) {
                utResults.push(`    [${key}] - akan dihapus (UT)`);
                utDeletedCount++;
            } else {
                try {
                    const result = await utapi.deleteFiles(key);
                    if (result.success && result.deletedCount > 0) {
                        utResults.push(`    [${key}] - berhasil dihapus (UT)`);
                        utDeletedCount++;
                        summary.utKeysDeleted++;
                    } else {
                        utResults.push(`    [${key}] - gagal dihapus (UT)`);
                        utFailedCount++;
                        summary.utDeletionFailures++;
                    }
                } catch {
                    utResults.push(`    [${key}] - gagal dihapus (UT)`);
                    utFailedCount++;
                    summary.utDeletionFailures++;
                }
            }
        }
    } else {
        reportLines.push(`  UploadThing keys: 0 (tidak ada)`);
    }

    reportLines.push(...utResults);

    // ── Update database ───────────────────────────────────────────────────
    const shouldClearDrive =
        driveFileIds.length > 0 && driveFailedCount === 0;
    const shouldClearUt = uploadthingKeys.length > 0 && utFailedCount === 0;

    if (!options.dryRun && (shouldClearDrive || shouldClearUt)) {
        await prisma.report.update({
            where: { reportNumber },
            data: {
                drivePhotoFileIds: shouldClearDrive
                    ? ([] as unknown as Prisma.InputJsonValue)
                    : undefined,
                uploadthingFileKeys: shouldClearUt
                    ? ([] as unknown as Prisma.InputJsonValue)
                    : undefined,
            },
        });

        if (shouldClearDrive) {
            reportLines.push(
                `  ✓ drivePhotoFileIds cleared (${driveDeletedCount} deleted)`,
            );
        }
        if (shouldClearUt) {
            reportLines.push(
                `  ✓ uploadthingFileKeys cleared (${utDeletedCount} deleted)`,
            );
        }
    } else if (options.dryRun) {
        if (shouldClearDrive) {
            reportLines.push(
                `  ✓ drivePhotoFileIds akan di-clear (${driveDeletedCount} planned)`,
            );
        }
        if (shouldClearUt) {
            reportLines.push(
                `  ✓ uploadthingFileKeys akan di-clear (${utDeletedCount} planned)`,
            );
        }
    } else {
        if (driveFailedCount > 0) {
            reportLines.push(
                `  ✗ drivePhotoFileIds TIDAK di-clear (${driveFailedCount} failures)`,
            );
        }
        if (utFailedCount > 0) {
            reportLines.push(
                `  ✗ uploadthingFileKeys TIDAK di-clear (${utFailedCount} failures)`,
            );
        }
    }

    reportLines.push("");
    return reportLines;
}

async function main() {
    const startedAt = Date.now();
    const options = parseOptions();

    logger.info(
        { operation: OPERATION, dryRun: options.dryRun },
        "Starting cleanup for approved PJUM photos",
    );

    const summary: RunSummary = {
        reportsProcessed: 0,
        driveFilesDeleted: 0,
        driveFilesPlanned: 0,
        driveDeletionFailures: 0,
        utKeysProcessed: 0,
        utKeysDeleted: 0,
        utDeletionFailures: 0,
    };

    try {
        // Query eligible reports: COMPLETED + in APPROVED PJUM
        const approvedExports = await prisma.pjumExport.findMany({
            where: {
                status: "APPROVED",
                approvedAt: { not: null },
            },
            select: {
                reportNumbers: true,
            },
        });

        const reportNumbers = Array.from(
            new Set(approvedExports.flatMap((row) => row.reportNumbers)),
        );

        if (reportNumbers.length === 0) {
            await fs.writeFile(
                OUTPUT_FILE,
                "Tidak ada PJUM APPROVED yang memiliki report untuk diproses.\n",
                "utf8",
            );
            console.log(
                options.dryRun
                    ? "Mode: DRY RUN (tanpa delete/update DB)"
                    : "Mode: EXECUTE",
            );
            console.log(`Output summary ditulis ke: ${OUTPUT_FILE}`);
            return;
        }

        const reports = await prisma.report.findMany({
            where: {
                reportNumber: { in: reportNumbers },
                status: "COMPLETED",
            },
            select: {
                reportNumber: true,
                drivePhotoFileIds: true,
                uploadthingFileKeys: true,
            },
            orderBy: { reportNumber: "asc" },
        });

        const totalDriveFiles = reports.reduce((sum, r) => {
            return sum + toArray(r.drivePhotoFileIds).length;
        }, 0);

        const progress: CleanupProgress = {
            totalReports: reports.length,
            processedReports: 0,
            totalDriveFiles,
            processedDriveFiles: 0,
        };

        const utapi = new UTApi();
        const outputLines: string[] = [];
        outputLines.push(
            options.dryRun
                ? "Mode: DRY RUN (tanpa delete/update DB)"
                : "Mode: EXECUTE",
        );
        outputLines.push("");

        if (reports.length > 0) {
            renderProgress(progress, options);
        }

        for (const report of reports) {
            summary.reportsProcessed++;

            const driveFileIds = toArray(report.drivePhotoFileIds);
            const uploadthingKeys = toArray(report.uploadthingFileKeys);

            const lines = await processReport(
                report.reportNumber,
                driveFileIds,
                uploadthingKeys,
                utapi,
                summary,
                options,
            );

            outputLines.push(...lines);

            progress.processedDriveFiles += driveFileIds.length;
            progress.processedReports++;
            renderProgress(progress, options);
        }

        finishProgress(progress, options);

        if (outputLines.length === 0) {
            outputLines.push("Tidak ada report untuk diproses.");
            outputLines.push("");
        }

        outputLines.push("=== Ringkasan Global ===");
        outputLines.push(`Report diproses: ${summary.reportsProcessed}`);
        outputLines.push(
            options.dryRun
                ? `Drive files planned for deletion: ${summary.driveFilesPlanned}`
                : `Drive files deleted: ${summary.driveFilesDeleted}`,
        );
        outputLines.push(
            `Drive deletion failures: ${summary.driveDeletionFailures}`,
        );
        outputLines.push(`UploadThing keys processed: ${summary.utKeysProcessed}`);
        outputLines.push(
            options.dryRun
                ? `UploadThing keys planned for deletion: ${summary.utKeysProcessed}`
                : `UploadThing keys deleted: ${summary.utKeysDeleted}`,
        );
        outputLines.push(
            `UploadThing deletion failures: ${summary.utDeletionFailures}`,
        );

        await fs.writeFile(OUTPUT_FILE, outputLines.join("\n"), "utf8");

        const durationMs = Date.now() - startedAt;
        logger.info(
            {
                operation: OPERATION,
                durationMs,
                reportsProcessed: summary.reportsProcessed,
                driveFilesDeleted: summary.driveFilesDeleted,
                driveFilesPlanned: summary.driveFilesPlanned,
                outputFile: OUTPUT_FILE,
                dryRun: options.dryRun,
            },
            "Cleanup for approved PJUM photos completed",
        );

        console.log("Cleanup foto PJUM APPROVED selesai.");
        console.log(
            options.dryRun
                ? "Mode: DRY RUN (tanpa delete/update DB)"
                : "Mode: EXECUTE",
        );
        console.log(`Output summary: ${OUTPUT_FILE}`);
        console.log(`Report diproses: ${summary.reportsProcessed}`);
        console.log(
            options.dryRun
                ? `Drive files planned: ${summary.driveFilesPlanned}`
                : `Drive files deleted: ${summary.driveFilesDeleted}`,
        );
    } catch (error) {
        logger.error(
            { operation: OPERATION, durationMs: Date.now() - startedAt },
            "Cleanup for approved PJUM photos failed",
            error,
        );
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("Gagal menjalankan script cleanup PJUM photos:", error);
    process.exitCode = 1;
});
