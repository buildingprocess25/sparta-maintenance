import "dotenv/config";

import { createWriteStream, promises as fs } from "node:fs";
import { once } from "node:events";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deletePhotoFromDriveCdn } from "@/lib/storage/drive-photo-service";

type ScriptOptions = {
    dryRun: boolean;
    concurrency: number;
};

type CleanupProgress = {
    totalReports: number;
    processedReports: number;
    totalDriveFiles: number;
    processedDriveFiles: number;
    totalUtKeys: number;
    processedUtKeys: number;
};

type RunSummary = {
    reportsProcessed: number;
    reportsSkipped: number;
    driveFilesProcessed: number;
    driveFilesDeleted: number;
    driveFilesPlanned: number;
    driveDeletionFailures: number;
    utKeysProcessed: number;
    utKeysDeleted: number;
    utKeysPlanned: number;
    utDeletionFailures: number;
    dbUpdates: number;
};

type DeleteResult = {
    value: string;
    success: boolean;
};

type ReportRow = {
    reportNumber: string;
    drivePhotoFileIds: unknown;
    uploadthingFileKeys: unknown;
};

type ProgressCallbacks = {
    onDriveFileProcessed: () => void;
    onUtKeyProcessed: () => void;
};

const OPERATION = "scripts.cleanupApprovedPjumPhotos";
const OUTPUT_FILE = join(process.cwd(), "cleanup-output.txt");
const PROGRESS_BAR_WIDTH = 20;
const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 10;

function parseOptions(): ScriptOptions {
    const rawArgs = process.argv.slice(2);
    const args = new Set(rawArgs);
    const dryRun = args.has("--dry-run") || !args.has("--execute");
    const cliConcurrency = rawArgs
        .find((arg) => arg.startsWith("--concurrency="))
        ?.split("=")[1];

    return {
        dryRun,
        concurrency: parseConcurrency(
            cliConcurrency ?? process.env.CLEANUP_CONCURRENCY,
        ),
    };
}

function parseConcurrency(raw: string | undefined): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_CONCURRENCY;
    }

    return Math.min(Math.floor(parsed), MAX_CONCURRENCY);
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
    const ut = buildProgressBar(progress.processedUtKeys, progress.totalUtKeys);
    const mode = options.dryRun ? "DRY RUN" : "EXECUTE";

    process.stdout.write(
        `\r[${mode}] Report [${report.bar}] ${report.percent.toFixed(1)}% (${progress.processedReports}/${progress.totalReports}) | Drive [${drive.bar}] ${drive.percent.toFixed(1)}% (${progress.processedDriveFiles}/${progress.totalDriveFiles}) | UT [${ut.bar}] ${ut.percent.toFixed(1)}% (${progress.processedUtKeys}/${progress.totalUtKeys})`,
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

function unique(values: string[]): string[] {
    return Array.from(new Set(values));
}

async function mapWithConcurrency<T, R>(
    values: T[],
    concurrency: number,
    worker: (value: T) => Promise<R>,
): Promise<R[]> {
    if (values.length === 0) return [];

    const results = new Array<R>(values.length);
    let nextIndex = 0;

    async function runWorker(): Promise<void> {
        while (nextIndex < values.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(values[index]);
        }
    }

    const workerCount = Math.min(concurrency, values.length);
    await Promise.all(Array.from({ length: workerCount }, runWorker));

    return results;
}

async function writeLines(
    stream: NodeJS.WritableStream,
    lines: string[],
): Promise<void> {
    if (lines.length === 0) return;

    const canContinue = stream.write(`${lines.join("\n")}\n`);
    if (!canContinue) {
        await once(stream, "drain");
    }
}

async function closeStream(stream: NodeJS.WritableStream): Promise<void> {
    stream.end();
    await once(stream, "finish");
}

async function deleteDriveFiles(
    fileIds: string[],
    summary: RunSummary,
    options: ScriptOptions,
    progressCallbacks: ProgressCallbacks,
): Promise<DeleteResult[]> {
    return mapWithConcurrency(fileIds, options.concurrency, async (fileId) => {
        summary.driveFilesProcessed += 1;

        if (options.dryRun) {
            summary.driveFilesPlanned += 1;
            progressCallbacks.onDriveFileProcessed();
            return { value: fileId, success: true };
        }

        const success = await deletePhotoFromDriveCdn(fileId);
        if (success) {
            summary.driveFilesDeleted += 1;
        } else {
            summary.driveDeletionFailures += 1;
        }

        progressCallbacks.onDriveFileProcessed();
        return { value: fileId, success };
    });
}

async function deleteUploadThingKeys(
    keys: string[],
    utapi: UTApi,
    summary: RunSummary,
    options: ScriptOptions,
    progressCallbacks: ProgressCallbacks,
): Promise<DeleteResult[]> {
    return mapWithConcurrency(keys, options.concurrency, async (key) => {
        summary.utKeysProcessed += 1;

        if (options.dryRun) {
            summary.utKeysPlanned += 1;
            progressCallbacks.onUtKeyProcessed();
            return { value: key, success: true };
        }

        try {
            const result = await utapi.deleteFiles(key);
            const success = result.success && result.deletedCount > 0;

            if (success) {
                summary.utKeysDeleted += 1;
            } else {
                summary.utDeletionFailures += 1;
            }

            progressCallbacks.onUtKeyProcessed();
            return { value: key, success };
        } catch (error) {
            summary.utDeletionFailures += 1;
            logger.warn(
                {
                    operation: OPERATION,
                    key,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                },
                "Failed to delete UploadThing file",
            );

            progressCallbacks.onUtKeyProcessed();
            return { value: key, success: false };
        }
    });
}

function formatResults(
    results: DeleteResult[],
    dryRun: boolean,
    suffix = "",
): string[] {
    return results.map((result) => {
        const status = dryRun
            ? "akan dihapus"
            : result.success
              ? "berhasil dihapus"
              : "gagal dihapus";
        return `    [${result.value}] - ${status}${suffix}`;
    });
}

async function processReport(
    report: ReportRow,
    utapi: UTApi,
    summary: RunSummary,
    options: ScriptOptions,
    progressCallbacks: ProgressCallbacks,
): Promise<string[]> {
    const reportLines: string[] = [];
    const driveFileIdsRaw = toArray(report.drivePhotoFileIds);
    const uploadthingKeysRaw = toArray(report.uploadthingFileKeys);
    const driveFileIds = unique(driveFileIdsRaw);
    const uploadthingKeys = unique(uploadthingKeysRaw);

    reportLines.push(`Report: ${report.reportNumber}`);

    if (driveFileIdsRaw.length !== driveFileIds.length) {
        reportLines.push(
            `  Drive files: ${driveFileIds.length} unique (${driveFileIdsRaw.length - driveFileIds.length} duplikat dilewati)`,
        );
    } else {
        reportLines.push(`  Drive files: ${driveFileIds.length}`);
    }

    const driveResults = await deleteDriveFiles(
        driveFileIds,
        summary,
        options,
        progressCallbacks,
    );
    reportLines.push(...formatResults(driveResults, options.dryRun));

    if (uploadthingKeysRaw.length !== uploadthingKeys.length) {
        reportLines.push(
            `  UploadThing keys: ${uploadthingKeys.length} unique (${uploadthingKeysRaw.length - uploadthingKeys.length} duplikat dilewati)`,
        );
    } else {
        reportLines.push(`  UploadThing keys: ${uploadthingKeys.length}`);
    }

    const utResults = await deleteUploadThingKeys(
        uploadthingKeys,
        utapi,
        summary,
        options,
        progressCallbacks,
    );
    reportLines.push(...formatResults(utResults, options.dryRun, " (UT)"));

    const shouldClearDrive =
        driveFileIds.length > 0 &&
        driveResults.every((result) => result.success);
    const shouldClearUt =
        uploadthingKeys.length > 0 &&
        utResults.every((result) => result.success);

    if (!options.dryRun && (shouldClearDrive || shouldClearUt)) {
        await prisma.report.update({
            where: { reportNumber: report.reportNumber },
            data: {
                drivePhotoFileIds: shouldClearDrive
                    ? ([] as unknown as Prisma.InputJsonValue)
                    : undefined,
                uploadthingFileKeys: shouldClearUt
                    ? ([] as unknown as Prisma.InputJsonValue)
                    : undefined,
            },
        });

        summary.dbUpdates += 1;

        if (shouldClearDrive) {
            reportLines.push(
                `  OK drivePhotoFileIds cleared (${driveResults.length} deleted)`,
            );
        }
        if (shouldClearUt) {
            reportLines.push(
                `  OK uploadthingFileKeys cleared (${utResults.length} deleted)`,
            );
        }
    } else if (options.dryRun) {
        if (shouldClearDrive) {
            reportLines.push(
                `  OK drivePhotoFileIds akan di-clear (${driveResults.length} planned)`,
            );
        }
        if (shouldClearUt) {
            reportLines.push(
                `  OK uploadthingFileKeys akan di-clear (${utResults.length} planned)`,
            );
        }
    } else {
        const driveFailures = driveResults.filter(
            (result) => !result.success,
        ).length;
        const utFailures = utResults.filter((result) => !result.success).length;

        if (driveFailures > 0) {
            reportLines.push(
                `  FAIL drivePhotoFileIds TIDAK di-clear (${driveFailures} failures)`,
            );
        }
        if (utFailures > 0) {
            reportLines.push(
                `  FAIL uploadthingFileKeys TIDAK di-clear (${utFailures} failures)`,
            );
        }
    }

    reportLines.push("");
    return reportLines;
}

function hasCleanupTargets(report: ReportRow): boolean {
    return (
        toArray(report.drivePhotoFileIds).length > 0 ||
        toArray(report.uploadthingFileKeys).length > 0
    );
}

async function main() {
    const startedAt = Date.now();
    const options = parseOptions();

    logger.info(
        {
            operation: OPERATION,
            dryRun: options.dryRun,
            concurrency: options.concurrency,
        },
        "Starting cleanup for approved PJUM photos",
    );

    const summary: RunSummary = {
        reportsProcessed: 0,
        reportsSkipped: 0,
        driveFilesProcessed: 0,
        driveFilesDeleted: 0,
        driveFilesPlanned: 0,
        driveDeletionFailures: 0,
        utKeysProcessed: 0,
        utKeysDeleted: 0,
        utKeysPlanned: 0,
        utDeletionFailures: 0,
        dbUpdates: 0,
    };

    let outputStream: ReturnType<typeof createWriteStream> | null = null;

    try {
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

        const targetReports = reports.filter(hasCleanupTargets);
        summary.reportsSkipped = reports.length - targetReports.length;

        const totalDriveFiles = targetReports.reduce((sum, report) => {
            return sum + unique(toArray(report.drivePhotoFileIds)).length;
        }, 0);
        const totalUtKeys = targetReports.reduce((sum, report) => {
            return sum + unique(toArray(report.uploadthingFileKeys)).length;
        }, 0);

        const progress: CleanupProgress = {
            totalReports: targetReports.length,
            processedReports: 0,
            totalDriveFiles,
            processedDriveFiles: 0,
            totalUtKeys,
            processedUtKeys: 0,
        };

        outputStream = createWriteStream(OUTPUT_FILE, { encoding: "utf8" });
        await writeLines(outputStream, [
            options.dryRun
                ? "Mode: DRY RUN (tanpa delete/update DB)"
                : "Mode: EXECUTE",
            `Concurrency: ${options.concurrency}`,
            "",
        ]);

        if (targetReports.length === 0) {
            await writeLines(outputStream, [
                "Tidak ada report COMPLETED dengan drivePhotoFileIds/uploadthingFileKeys untuk diproses.",
                "",
            ]);
        } else {
            renderProgress(progress, options);
        }

        const utapi = new UTApi();

        for (const report of targetReports) {
            summary.reportsProcessed += 1;
            const lines = await processReport(report, utapi, summary, options, {
                onDriveFileProcessed: () => {
                    progress.processedDriveFiles += 1;
                    renderProgress(progress, options);
                },
                onUtKeyProcessed: () => {
                    progress.processedUtKeys += 1;
                    renderProgress(progress, options);
                },
            });

            await writeLines(outputStream, lines);

            progress.processedReports += 1;
            renderProgress(progress, options);

            if (
                !process.stdout.isTTY &&
                (summary.reportsProcessed % 25 === 0 ||
                    summary.reportsProcessed === targetReports.length)
            ) {
                logger.info(
                    {
                        operation: OPERATION,
                        processedReports: summary.reportsProcessed,
                        totalReports: targetReports.length,
                        processedDriveFiles: summary.driveFilesProcessed,
                        processedUtKeys: summary.utKeysProcessed,
                        dryRun: options.dryRun,
                    },
                    "Cleanup progress",
                );
            }
        }

        finishProgress(progress, options);

        await writeLines(outputStream, [
            "=== Ringkasan Global ===",
            `Report diproses: ${summary.reportsProcessed}`,
            `Report dilewati (tanpa file): ${summary.reportsSkipped}`,
            options.dryRun
                ? `Drive files planned for deletion: ${summary.driveFilesPlanned}`
                : `Drive files deleted: ${summary.driveFilesDeleted}`,
            `Drive files processed: ${summary.driveFilesProcessed}`,
            `Drive deletion failures: ${summary.driveDeletionFailures}`,
            `UploadThing keys processed: ${summary.utKeysProcessed}`,
            options.dryRun
                ? `UploadThing keys planned for deletion: ${summary.utKeysPlanned}`
                : `UploadThing keys deleted: ${summary.utKeysDeleted}`,
            `UploadThing deletion failures: ${summary.utDeletionFailures}`,
            `DB updates: ${summary.dbUpdates}`,
        ]);

        await closeStream(outputStream);
        outputStream = null;

        const durationMs = Date.now() - startedAt;
        logger.info(
            {
                operation: OPERATION,
                durationMs,
                reportsProcessed: summary.reportsProcessed,
                reportsSkipped: summary.reportsSkipped,
                driveFilesDeleted: summary.driveFilesDeleted,
                driveFilesPlanned: summary.driveFilesPlanned,
                utKeysDeleted: summary.utKeysDeleted,
                utKeysPlanned: summary.utKeysPlanned,
                dbUpdates: summary.dbUpdates,
                outputFile: OUTPUT_FILE,
                dryRun: options.dryRun,
                concurrency: options.concurrency,
            },
            "Cleanup for approved PJUM photos completed",
        );

        console.log("Cleanup foto PJUM APPROVED selesai.");
        console.log(
            options.dryRun
                ? "Mode: DRY RUN (tanpa delete/update DB)"
                : "Mode: EXECUTE",
        );
        console.log(`Concurrency: ${options.concurrency}`);
        console.log(`Output summary: ${OUTPUT_FILE}`);
        console.log(`Report diproses: ${summary.reportsProcessed}`);
        console.log(`Report dilewati: ${summary.reportsSkipped}`);
        console.log(
            options.dryRun
                ? `Drive files planned: ${summary.driveFilesPlanned}`
                : `Drive files deleted: ${summary.driveFilesDeleted}`,
        );
        console.log(
            options.dryRun
                ? `UploadThing keys planned: ${summary.utKeysPlanned}`
                : `UploadThing keys deleted: ${summary.utKeysDeleted}`,
        );
    } catch (error) {
        logger.error(
            { operation: OPERATION, durationMs: Date.now() - startedAt },
            "Cleanup for approved PJUM photos failed",
            error,
        );
        throw error;
    } finally {
        if (outputStream) {
            await closeStream(outputStream);
        }
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("Gagal menjalankan script cleanup PJUM photos:", error);
    process.exitCode = 1;
});
