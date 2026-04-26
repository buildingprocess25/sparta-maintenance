import "dotenv/config";

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { Prisma } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ensureDriveFolderPath } from "@/lib/google-drive/files";
import { getGoogleDriveClient } from "@/lib/google-drive/client";

type PhotoCategory = "checklist" | "startwork" | "completion";

type ReportRow = {
    reportNumber: string;
    branchName: string;
    storeCode: string | null;
    storeName: string;
    createdByNIK: string;
    createdBy: {
        name: string;
    };
    startSelfieUrl: string | null;
    startReceiptUrls: unknown;
    items: unknown;
    completionAdditionalPhotos: unknown;
    uploadthingFileKeys: unknown;
};

type CategorizedPhotoLite = {
    key: string;
    url: string;
    category: PhotoCategory;
    filename: string;
};

type KeyProcessResult = {
    message: string;
};

type ScriptOptions = {
    dryRun: boolean;
};

type ArchiveProgress = {
    totalReports: number;
    totalKeys: number;
    processedReports: number;
    processedKeys: number;
};

type ProgressCallbacks = {
    onKeyProcessed: () => void;
};

type RunSummary = {
    reportsProcessed: number;
    reportWithKeys: number;
    keysProcessed: number;
    keysRemovedFromDb: number;
    keysPlannedForDbRemoval: number;
    moveAndDelete: number;
    driveExistsDeletedUt: number;
    driveExistsRemovedDbOnly: number;
    missingPhoto: number;
    otherFailures: number;
};

const OPERATION = "scripts.archiveApprovedPjumPhotos";
const OUTPUT_FILE = join(process.cwd(), "output.txt");
const MAX_UPLOAD_RETRIES = 3;
const UT_LOOKUP_BATCH_SIZE = 100;
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

function renderArchiveProgress(
    progress: ArchiveProgress,
    options: ScriptOptions,
): void {
    if (!process.stdout.isTTY) return;

    const report = buildProgressBar(
        progress.processedReports,
        progress.totalReports,
    );
    const key = buildProgressBar(progress.processedKeys, progress.totalKeys);
    const mode = options.dryRun ? "DRY RUN" : "EXECUTE";

    process.stdout.write(
        `\r[${mode}] Report [${report.bar}] ${report.percent.toFixed(1)}% (${progress.processedReports}/${progress.totalReports}) | Key [${key.bar}] ${key.percent.toFixed(1)}% (${progress.processedKeys}/${progress.totalKeys})`,
    );
}

function finishArchiveProgress(
    progress: ArchiveProgress,
    options: ScriptOptions,
): void {
    if (!process.stdout.isTTY) return;
    renderArchiveProgress(progress, options);
    process.stdout.write("\n");
}

const SUBFOLDER: Record<PhotoCategory, string> = {
    checklist: "Foto Checklist",
    startwork: "Foto Mulai Pekerjaan",
    completion: "Foto Tambahan",
};

function sanitizeDriveName(value: string): string {
    return value.replaceAll("/", "-").trim() || "-";
}

function escapeDriveQueryValue(value: string): string {
    return value.replace(/'/g, "\\'");
}

function normalizeUrl(value: string): string {
    try {
        const parsed = new URL(value);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
    } catch {
        return value.trim();
    }
}

function extractUploadThingKey(url: string): string | null {
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        const fIndex = segments.findIndex((s) => s === "f");
        if (fIndex >= 0 && segments[fIndex + 1]) {
            return segments[fIndex + 1];
        }

        const last = segments[segments.length - 1];
        return last || null;
    } catch {
        return null;
    }
}

function getExtensionFromUrl(url: string | null): string {
    if (!url) return "jpg";

    try {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const match = path.match(/\.([A-Za-z0-9]+)$/);
        return match?.[1]?.toLowerCase() ?? "jpg";
    } catch {
        return "jpg";
    }
}

function buildFallbackFileName(key: string, url: string | null): string {
    const ext = getExtensionFromUrl(url);
    return `${sanitizeDriveName(key)}.${ext}`;
}

function buildStoreFolderSegments(report: ReportRow): string[] {
    const branchName = sanitizeDriveName(report.branchName);
    const bmsFolder = `${sanitizeDriveName(report.createdByNIK)}-${sanitizeDriveName(report.createdBy.name || report.createdByNIK)}`;
    const storeFolderName = `${sanitizeDriveName(report.storeCode ?? "-")}-${sanitizeDriveName(report.storeName)}`;
    const reportFolderName = sanitizeDriveName(report.reportNumber);

    return [
        "Laporan Maintenance",
        branchName,
        bmsFolder,
        storeFolderName,
        reportFolderName,
    ];
}

function toDbKeys(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (k): k is string => typeof k === "string" && k.trim().length > 0,
    );
}

function parseJsonStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
}

function collectCategorizedPhotoUrlsForScript(report: {
    startSelfieUrl: string | null;
    startReceiptUrls: unknown;
    items: unknown;
    completionAdditionalPhotos: unknown;
}): Array<{ url: string; category: PhotoCategory; filename: string }> {
    const photos: Array<{
        url: string;
        category: PhotoCategory;
        filename: string;
    }> = [];

    if (report.startSelfieUrl) {
        const raw = report.startSelfieUrl.trim();
        const urls = raw.startsWith("[")
            ? (() => {
                  try {
                      const parsed = JSON.parse(raw) as unknown;
                      return Array.isArray(parsed)
                          ? parsed.filter(
                                (u): u is string =>
                                    typeof u === "string" &&
                                    u.trim().length > 0,
                            )
                          : [];
                  } catch {
                      return [];
                  }
              })()
            : [raw];

        urls.forEach((url, i) => {
            photos.push({
                url,
                category: "startwork",
                filename: `selfie-${String(i + 1).padStart(3, "0")}.jpg`,
            });
        });
    }

    parseJsonStringArray(report.startReceiptUrls).forEach((url, i) => {
        photos.push({
            url,
            category: "startwork",
            filename: `nota-${String(i + 1).padStart(3, "0")}.jpg`,
        });
    });

    if (Array.isArray(report.items)) {
        let checklistIdx = 1;
        for (const item of report.items as Record<string, unknown>[]) {
            if (
                typeof item.photoUrl === "string" &&
                item.photoUrl.trim().length > 0
            ) {
                const itemId =
                    typeof item.itemId === "string" ? item.itemId : "item";
                photos.push({
                    url: item.photoUrl,
                    category: "checklist",
                    filename: `${itemId}-${String(checklistIdx).padStart(3, "0")}.jpg`,
                });
                checklistIdx += 1;
            }

            if (Array.isArray(item.afterImages)) {
                parseJsonStringArray(item.afterImages).forEach((url, i) => {
                    const itemId =
                        typeof item.itemId === "string" ? item.itemId : "item";
                    photos.push({
                        url,
                        category: "checklist",
                        filename: `${itemId}-after-${String(i + 1).padStart(3, "0")}.jpg`,
                    });
                });
            }
        }
    }

    parseJsonStringArray(report.completionAdditionalPhotos).forEach(
        (url, i) => {
            photos.push({
                url,
                category: "completion",
                filename: `completion-${String(i + 1).padStart(3, "0")}.jpg`,
            });
        },
    );

    const seen = new Set<string>();
    return photos.filter((row) => {
        const normalized = normalizeUrl(row.url);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}

function toCategorizedPhotoMap(report: ReportRow): {
    byKey: Map<string, CategorizedPhotoLite>;
    byUrl: Map<string, CategorizedPhotoLite>;
} {
    const photos = collectCategorizedPhotoUrlsForScript({
        startSelfieUrl: report.startSelfieUrl,
        startReceiptUrls: report.startReceiptUrls,
        items: report.items,
        completionAdditionalPhotos: report.completionAdditionalPhotos,
    });

    const byKey = new Map<string, CategorizedPhotoLite>();
    const byUrl = new Map<string, CategorizedPhotoLite>();

    for (const photo of photos) {
        const normalized = normalizeUrl(photo.url);
        const key = extractUploadThingKey(photo.url) ?? "";
        const row: CategorizedPhotoLite = {
            key,
            url: photo.url,
            category: photo.category,
            filename: photo.filename,
        };

        if (key && !byKey.has(key)) {
            byKey.set(key, row);
        }
        if (!byUrl.has(normalized)) {
            byUrl.set(normalized, row);
        }
    }

    return { byKey, byUrl };
}

async function findDriveFolderByPath(
    pathSegments: string[],
    cache: Map<string, string | null>,
): Promise<string | null> {
    const { drive, config } = getGoogleDriveClient();

    const normalized = pathSegments.map((s) => s.trim()).filter(Boolean);
    const pathKey = `${config.rootFolderId}/${normalized.join("/")}`;

    if (cache.has(pathKey)) {
        return cache.get(pathKey) ?? null;
    }

    let parentId = config.rootFolderId;

    for (const segment of normalized) {
        const lookupKey = `${parentId}::${segment}`;
        if (cache.has(lookupKey)) {
            const cached = cache.get(lookupKey);
            if (!cached) {
                cache.set(pathKey, null);
                return null;
            }
            parentId = cached;
            continue;
        }

        const safeSegment = escapeDriveQueryValue(segment);
        const response = await drive.files.list({
            q: `'${parentId}' in parents and name='${safeSegment}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 1,
        });

        const found = response.data.files?.[0]?.id ?? null;
        cache.set(lookupKey, found);

        if (!found) {
            cache.set(pathKey, null);
            return null;
        }

        parentId = found;
    }

    cache.set(pathKey, parentId);
    return parentId;
}

async function uploadPhotoToDriveFolder(
    photoUrl: string,
    folderId: string,
    fileName: string,
): Promise<boolean> {
    const { drive } = getGoogleDriveClient();

    try {
        const response = await fetch(photoUrl);
        if (!response.ok || !response.body) {
            return false;
        }

        const webStream = response.body as import("stream/web").ReadableStream;
        const nodeStream = Readable.fromWeb(webStream);
        const contentType =
            response.headers.get("content-type") ?? "image/jpeg";

        const created = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: contentType,
            },
            media: {
                mimeType: contentType,
                body: nodeStream,
            },
            fields: "id",
            supportsAllDrives: true,
        });

        return Boolean(created.data.id);
    } catch {
        return false;
    }
}

async function uploadPhotoToDriveFolderWithRetry(
    photoUrl: string,
    folderId: string,
    fileName: string,
): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
        const uploaded = await uploadPhotoToDriveFolder(
            photoUrl,
            folderId,
            fileName,
        );
        if (uploaded) return true;

        logger.warn(
            {
                operation: OPERATION,
                attempt,
                maxAttempts: MAX_UPLOAD_RETRIES,
                fileName,
            },
            "Upload photo to Drive failed on attempt",
        );
    }

    return false;
}

async function getUtFileUrl(utapi: UTApi, key: string): Promise<string | null> {
    try {
        const res = await utapi.getFileUrls(key);
        const row = res.data.find((d) => d.key === key) ?? res.data[0];
        return row?.url ?? null;
    } catch {
        return null;
    }
}

async function getUtFileUrlMap(
    utapi: UTApi,
    keys: string[],
): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    for (let i = 0; i < keys.length; i += UT_LOOKUP_BATCH_SIZE) {
        const batch = keys.slice(i, i + UT_LOOKUP_BATCH_SIZE);
        try {
            const res = await utapi.getFileUrls(batch);
            for (const row of res.data) {
                if (row.key && row.url) {
                    map.set(row.key, row.url);
                }
            }
        } catch (error) {
            logger.warn(
                {
                    operation: OPERATION,
                    batchStart: i,
                    batchSize: batch.length,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                },
                "Failed batch UploadThing URL lookup",
            );

            for (const key of batch) {
                const url = await getUtFileUrl(utapi, key);
                if (url) {
                    map.set(key, url);
                }
            }
        }
    }

    return map;
}

async function deleteUtFile(utapi: UTApi, key: string): Promise<boolean> {
    try {
        const result = await utapi.deleteFiles(key);
        return result.success && result.deletedCount > 0;
    } catch {
        return false;
    }
}

async function resolveDrivePresence(
    reportSegments: string[],
    category: PhotoCategory,
    fileName: string,
    folderLookupCache: Map<string, string | null>,
    categoryFileCache: Map<PhotoCategory, Set<string> | null>,
): Promise<boolean> {
    const cachedNames = categoryFileCache.get(category);
    if (cachedNames === null) return false;
    if (cachedNames) {
        return cachedNames.has(fileName);
    }

    const folderId = await findDriveFolderByPath(
        [...reportSegments, SUBFOLDER[category]],
        folderLookupCache,
    );

    if (!folderId) {
        categoryFileCache.set(category, null);
        return false;
    }

    const fileNames = await listDriveFileNames(folderId);
    categoryFileCache.set(category, fileNames);

    return fileNames.has(fileName);
}

async function ensureDriveCategoryFolder(
    reportSegments: string[],
    category: PhotoCategory,
): Promise<string> {
    return ensureDriveFolderPath([...reportSegments, SUBFOLDER[category]]);
}

async function listDriveFileNames(folderId: string): Promise<Set<string>> {
    const { drive } = getGoogleDriveClient();
    const names = new Set<string>();
    let pageToken: string | undefined;

    do {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: "nextPageToken,files(name)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 1000,
            pageToken,
        });

        for (const file of response.data.files ?? []) {
            if (file.name) {
                names.add(file.name);
            }
        }

        pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return names;
}

async function processReport(
    report: ReportRow,
    utapi: UTApi,
    summary: RunSummary,
    options: ScriptOptions,
    progressCallbacks: ProgressCallbacks,
): Promise<string[]> {
    const reportLines: string[] = [];
    const bmsName = report.createdBy.name || report.createdByNIK;

    reportLines.push(`${bmsName} - ${report.reportNumber}`);
    reportLines.push("list filekey:");

    const dbKeysRaw = toDbKeys(report.uploadthingFileKeys);
    const uniqueDbKeys = Array.from(new Set(dbKeysRaw));

    if (uniqueDbKeys.length === 0) {
        reportLines.push("- (tidak ada key)");
        reportLines.push("");
        return reportLines;
    }

    summary.reportWithKeys += 1;

    const reportSegments = buildStoreFolderSegments(report);
    const { byKey, byUrl } = toCategorizedPhotoMap(report);
    const folderLookupCache = new Map<string, string | null>();
    const categoryFileCache = new Map<PhotoCategory, Set<string> | null>();
    const keysToRemove = new Set<string>();
    const utUrlMap = await getUtFileUrlMap(utapi, uniqueDbKeys);

    const keyResults: KeyProcessResult[] = [];

    for (const [index, key] of uniqueDbKeys.entries()) {
        summary.keysProcessed += 1;
        progressCallbacks.onKeyProcessed();

        if (
            !process.stdout.isTTY &&
            ((index + 1) % 50 === 0 || index + 1 === uniqueDbKeys.length)
        ) {
            logger.info(
                {
                    operation: OPERATION,
                    reportNumber: report.reportNumber,
                    processedKeys: index + 1,
                    totalKeys: uniqueDbKeys.length,
                    dryRun: options.dryRun,
                },
                "Progress processing report photo keys",
            );
        }

        let photo = byKey.get(key);
        const utUrl = utUrlMap.get(key) ?? null;
        const utExists = Boolean(utUrl);

        if (!photo && utUrl) {
            photo = byUrl.get(normalizeUrl(utUrl));
        }

        const category: PhotoCategory = photo?.category ?? "completion";
        const fileName = photo?.filename ?? buildFallbackFileName(key, utUrl);

        const isOnDrive = await resolveDrivePresence(
            reportSegments,
            category,
            fileName,
            folderLookupCache,
            categoryFileCache,
        );

        if (utExists && !isOnDrive) {
            if (options.dryRun) {
                summary.moveAndDelete += 1;
                keysToRemove.add(key);
                keyResults.push({
                    message: annotateDryRun(
                        `[${key}] - berhasil pindah+hapus`,
                        true,
                    ),
                });
                continue;
            }

            const folderId = await ensureDriveCategoryFolder(
                reportSegments,
                category,
            );

            const uploadedWithRetry = await uploadPhotoToDriveFolderWithRetry(
                utUrl as string,
                folderId,
                fileName,
            );

            if (!uploadedWithRetry) {
                summary.otherFailures += 1;
                keyResults.push({
                    message: annotateDryRun(
                        `[${key}] - gagal upload ke drive`,
                        options.dryRun,
                    ),
                });
                continue;
            }

            const deleted = await deleteUtFile(utapi, key);
            if (!deleted) {
                summary.otherFailures += 1;
                keyResults.push({
                    message: annotateDryRun(
                        `[${key}] - berhasil pindah ke drive, tapi gagal hapus dari UploadThing`,
                        options.dryRun,
                    ),
                });
                continue;
            }

            summary.moveAndDelete += 1;
            keysToRemove.add(key);
            const categorySet = categoryFileCache.get(category);
            if (categorySet) {
                categorySet.add(fileName);
            }
            keyResults.push({
                message: annotateDryRun(
                    `[${key}] - berhasil pindah+hapus`,
                    options.dryRun,
                ),
            });
            continue;
        }

        if (utExists && isOnDrive) {
            if (options.dryRun) {
                summary.driveExistsDeletedUt += 1;
                keysToRemove.add(key);
                keyResults.push({
                    message: annotateDryRun(
                        `[${key}] - ada di db dan sudah ada di drive, dihapus`,
                        true,
                    ),
                });
                continue;
            }

            const deleted = await deleteUtFile(utapi, key);
            if (!deleted) {
                summary.otherFailures += 1;
                keyResults.push({
                    message: annotateDryRun(
                        `[${key}] - ada di db dan sudah ada di drive, gagal hapus dari UploadThing`,
                        options.dryRun,
                    ),
                });
                continue;
            }

            summary.driveExistsDeletedUt += 1;
            keysToRemove.add(key);
            keyResults.push({
                message: annotateDryRun(
                    `[${key}] - ada di db dan sudah ada di drive, dihapus`,
                    options.dryRun,
                ),
            });
            continue;
        }

        if (!utExists && isOnDrive) {
            summary.driveExistsRemovedDbOnly += 1;
            keysToRemove.add(key);
            keyResults.push({
                message: annotateDryRun(
                    `[${key}] - sudah aman di drive, key db dihapus`,
                    options.dryRun,
                ),
            });
            continue;
        }

        summary.missingPhoto += 1;
        keysToRemove.add(key);
        keyResults.push({
            message: annotateDryRun(
                `[${key}] - foto HILANG! key db dihapus`,
                options.dryRun,
            ),
        });
    }

    for (const row of keyResults) {
        reportLines.push(`- ${row.message}`);
    }

    if (keysToRemove.size > 0) {
        const remainingKeys = dbKeysRaw.filter((key) => !keysToRemove.has(key));
        const removedCount = dbKeysRaw.length - remainingKeys.length;

        if (options.dryRun) {
            summary.keysPlannedForDbRemoval += removedCount;
        } else {
            await prisma.report.update({
                where: { reportNumber: report.reportNumber },
                data: {
                    uploadthingFileKeys:
                        remainingKeys as unknown as Prisma.InputJsonValue,
                },
            });

            summary.keysRemovedFromDb += removedCount;
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
        "Starting local archive for approved PJUM photo keys",
    );

    const summary: RunSummary = {
        reportsProcessed: 0,
        reportWithKeys: 0,
        keysProcessed: 0,
        keysRemovedFromDb: 0,
        keysPlannedForDbRemoval: 0,
        moveAndDelete: 0,
        driveExistsDeletedUt: 0,
        driveExistsRemovedDbOnly: 0,
        missingPhoto: 0,
        otherFailures: 0,
    };

    try {
        // Validate Google Drive env and credentials early.
        getGoogleDriveClient();

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
                    ? "Mode: DRY RUN (tanpa upload/delete/update DB)"
                    : "Mode: EXECUTE",
            );
            console.log(`Output summary ditulis ke: ${OUTPUT_FILE}`);
            return;
        }

        const reports = await prisma.report.findMany({
            where: {
                reportNumber: { in: reportNumbers },
            },
            select: {
                reportNumber: true,
                branchName: true,
                storeCode: true,
                storeName: true,
                createdByNIK: true,
                createdBy: {
                    select: {
                        name: true,
                    },
                },
                startSelfieUrl: true,
                startReceiptUrls: true,
                items: true,
                completionAdditionalPhotos: true,
                uploadthingFileKeys: true,
            },
            orderBy: { reportNumber: "asc" },
        });

        const targetReports = reports.filter(
            (row) => toDbKeys(row.uploadthingFileKeys).length > 0,
        );

        const totalKeysPlanned = targetReports.reduce((sum, row) => {
            const uniqueKeys = Array.from(
                new Set(toDbKeys(row.uploadthingFileKeys)),
            );
            return sum + uniqueKeys.length;
        }, 0);

        const progress: ArchiveProgress = {
            totalReports: targetReports.length,
            totalKeys: totalKeysPlanned,
            processedReports: 0,
            processedKeys: 0,
        };

        const utapi = new UTApi();
        const outputLines: string[] = [];
        outputLines.push(
            options.dryRun
                ? "Mode: DRY RUN (tanpa upload/delete/update DB)"
                : "Mode: EXECUTE",
        );
        outputLines.push("");

        if (targetReports.length > 0) {
            renderArchiveProgress(progress, options);
        }

        for (const report of targetReports) {
            summary.reportsProcessed += 1;
            const lines = await processReport(report, utapi, summary, options, {
                onKeyProcessed: () => {
                    progress.processedKeys += 1;
                    renderArchiveProgress(progress, options);
                },
            });
            outputLines.push(...lines);

            progress.processedReports += 1;
            renderArchiveProgress(progress, options);
        }

        finishArchiveProgress(progress, options);

        if (outputLines.length === 0) {
            outputLines.push(
                "Tidak ada report dengan uploadthingFileKeys untuk diproses.",
            );
            outputLines.push("");
        }

        outputLines.push("=== Ringkasan Global ===");
        outputLines.push(`Report diproses: ${summary.reportsProcessed}`);
        outputLines.push(`Report punya key: ${summary.reportWithKeys}`);
        outputLines.push(`Total key diproses: ${summary.keysProcessed}`);
        outputLines.push(
            options.dryRun
                ? `Key rencana dihapus dari DB: ${summary.keysPlannedForDbRemoval}`
                : `Key removed dari DB: ${summary.keysRemovedFromDb}`,
        );
        outputLines.push(`berhasil pindah+hapus: ${summary.moveAndDelete}`);
        outputLines.push(
            `ada di db dan sudah ada di drive, dihapus: ${summary.driveExistsDeletedUt}`,
        );
        outputLines.push(
            `sudah aman di drive, key db dihapus: ${summary.driveExistsRemovedDbOnly}`,
        );
        outputLines.push(`foto HILANG!: ${summary.missingPhoto}`);
        outputLines.push(`Kegagalan lain: ${summary.otherFailures}`);

        await fs.writeFile(OUTPUT_FILE, outputLines.join("\n"), "utf8");

        const durationMs = Date.now() - startedAt;
        logger.info(
            {
                operation: OPERATION,
                durationMs,
                reportsProcessed: summary.reportsProcessed,
                keysProcessed: summary.keysProcessed,
                outputFile: OUTPUT_FILE,
                dryRun: options.dryRun,
            },
            "Local archive for approved PJUM photo keys completed",
        );

        console.log("Arsip foto PJUM APPROVED selesai.");
        console.log(
            options.dryRun
                ? "Mode: DRY RUN (tanpa upload/delete/update DB)"
                : "Mode: EXECUTE",
        );
        console.log(`Output summary: ${OUTPUT_FILE}`);
        console.log(`Report diproses: ${summary.reportsProcessed}`);
        console.log(`Total key diproses: ${summary.keysProcessed}`);
        console.log(`foto HILANG!: ${summary.missingPhoto}`);
    } catch (error) {
        logger.error(
            { operation: OPERATION, durationMs: Date.now() - startedAt },
            "Local archive for approved PJUM photo keys failed",
            error,
        );
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("Gagal menjalankan script archive PJUM photos:", error);
    process.exitCode = 1;
});
