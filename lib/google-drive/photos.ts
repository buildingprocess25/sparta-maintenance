import "server-only";

import { Readable } from "stream";
import { getGoogleDriveClient } from "@/lib/google-drive/client";
import { ensureDriveFolderPath } from "@/lib/google-drive/files";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoArchiveParams {
    reportNumber: string;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    storeCode: string | null;
    storeName: string;
    /** All UploadThing file URLs to archive */
    photoUrls: string[];
    /** All UploadThing file keys to delete after archiving */
    fileKeys: string[];
}

export interface PhotoArchiveResult {
    /** Google Drive folder URL where photos were archived */
    photosFolderUrl: string;
    archivedCount: number;
    failedCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeDriveName(value: string): string {
    return value.replaceAll("/", "-").trim() || "-";
}

/**
 * Fetches a photo from a URL and uploads it as a JPEG to Google Drive.
 * Returns the Drive file ID on success, null on failure.
 */
async function uploadPhotoToDriveFolder(
    drive: ReturnType<typeof getGoogleDriveClient>["drive"],
    photoUrl: string,
    folderId: string,
    fileName: string,
): Promise<string | null> {
    try {
        const response = await fetch(photoUrl);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch photo: HTTP ${response.status} from ${photoUrl}`,
            );
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") ?? "image/jpeg";

        const created = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: contentType,
            },
            media: {
                mimeType: contentType,
                body: Readable.from(buffer),
            },
            fields: "id",
            supportsAllDrives: true,
        });

        return created.data.id ?? null;
    } catch {
        return null;
    }
}

// ─── Main archive function ─────────────────────────────────────────────────────

/**
 * Archives all UploadThing photos for a COMPLETED report to Google Drive.
 *
 * Flow:
 * 1. Ensure the "Foto" subfolder exists under the report's store folder.
 * 2. Download each photo from UploadThing and upload to Drive.
 * 3. After successful archive, delete all files from UploadThing via UTApi.
 *
 * This is intentionally fire-and-forget from `approveFinal` — errors are
 * logged but never thrown, preserving the approval flow.
 */
export async function archiveReportPhotosToGoogleDrive(
    params: PhotoArchiveParams,
): Promise<PhotoArchiveResult> {
    const { drive } = getGoogleDriveClient();

    const branchName = sanitizeDriveName(params.branchName);
    const bmsFolder = `${sanitizeDriveName(params.bmsNIK)}-${sanitizeDriveName(params.bmsName)}`;
    const storeFolderName = `${sanitizeDriveName(params.storeCode ?? "-")}-${sanitizeDriveName(params.storeName)}`;

    // Build Drive folder path:
    // Laporan Maintenance / {branch} / {bmsNIK}-{bmsName} / {store} / Foto / {reportNumber}
    const photoFolderId = await ensureDriveFolderPath([
        "Laporan Maintenance",
        branchName,
        bmsFolder,
        storeFolderName,
        "Foto",
        sanitizeDriveName(params.reportNumber),
    ]);

    const photosFolderUrl = `https://drive.google.com/drive/folders/${photoFolderId}`;

    // Archive each photo sequentially to avoid rate limits
    let archivedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < params.photoUrls.length; i++) {
        const url = params.photoUrls[i];
        const fileName = `photo-${String(i + 1).padStart(3, "0")}.jpg`;

        logger.info(
            {
                operation: "archiveReportPhotos",
                reportNumber: params.reportNumber,
                photoIndex: i + 1,
                total: params.photoUrls.length,
            },
            "Archiving photo to Drive",
        );

        const fileId = await uploadPhotoToDriveFolder(
            drive,
            url,
            photoFolderId,
            fileName,
        );

        if (fileId) {
            archivedCount++;
        } else {
            failedCount++;
            logger.warn(
                {
                    operation: "archiveReportPhotos",
                    reportNumber: params.reportNumber,
                    photoIndex: i + 1,
                    url,
                },
                "Failed to archive single photo to Drive",
            );
        }
    }

    // Delete from UploadThing only if all photos were archived successfully
    // (or we have no photos to archive — e.g., old reports with no keys)
    if (params.fileKeys.length > 0 && failedCount === 0) {
        try {
            const { UTApi } = await import("uploadthing/server");
            const utapi = new UTApi();
            await utapi.deleteFiles(params.fileKeys);
            logger.info(
                {
                    operation: "archiveReportPhotos",
                    reportNumber: params.reportNumber,
                    deletedKeys: params.fileKeys.length,
                },
                "Deleted photos from UploadThing after successful archive",
            );
        } catch (utErr) {
            // Non-fatal: Drive archive succeeded, UT cleanup failed.
            // Files will remain in UT but that's acceptable.
            logger.warn(
                {
                    operation: "archiveReportPhotos",
                    reportNumber: params.reportNumber,
                    keyCount: params.fileKeys.length,
                    err: String(utErr),
                },
                "Failed to delete photos from UploadThing (non-fatal)",
            );
        }
    } else if (failedCount > 0) {
        logger.warn(
            {
                operation: "archiveReportPhotos",
                reportNumber: params.reportNumber,
                failedCount,
                archivedCount,
            },
            "Skipping UploadThing deletion because some photos failed to archive",
        );
    }

    return { photosFolderUrl, archivedCount, failedCount };
}

/**
 * Collects all photo URLs from a report's JSON fields.
 * Pulls from: startSelfieUrl, startReceiptUrls, items (photoUrl, afterImages), completionAdditionalPhotos.
 */
export function collectReportPhotoUrls(report: {
    startSelfieUrl: string | null;
    startReceiptUrls: unknown;
    items: unknown;
    completionAdditionalPhotos: unknown;
}): string[] {
    const urls: string[] = [];

    // Start selfie
    if (report.startSelfieUrl) {
        const raw = report.startSelfieUrl.trim();
        if (raw.startsWith("[")) {
            try {
                const parsed: unknown = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    urls.push(
                        ...parsed.filter(
                            (u): u is string => typeof u === "string" && !!u,
                        ),
                    );
                }
            } catch {
                // ignore
            }
        } else {
            urls.push(raw);
        }
    }

    // Start receipt URLs
    const parseJsonStringArray = (raw: unknown): string[] => {
        if (Array.isArray(raw))
            return raw.filter(
                (u): u is string => typeof u === "string" && !!u,
            );
        return [];
    };

    urls.push(...parseJsonStringArray(report.startReceiptUrls));

    // Item photos: photoUrl, afterImages
    if (Array.isArray(report.items)) {
        for (const item of report.items as Record<string, unknown>[]) {
            if (typeof item.photoUrl === "string" && item.photoUrl)
                urls.push(item.photoUrl);
            if (Array.isArray(item.afterImages))
                urls.push(...parseJsonStringArray(item.afterImages));
        }
    }

    // Additional completion photos
    urls.push(...parseJsonStringArray(report.completionAdditionalPhotos));

    // Deduplicate
    return [...new Set(urls)];
}
