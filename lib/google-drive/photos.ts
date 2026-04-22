import "server-only";

import { Readable } from "stream";
import { getGoogleDriveClient } from "@/lib/google-drive/client";
import { ensureDriveFolderPath } from "@/lib/google-drive/files";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Photo category determines which subfolder under the store folder to use. */
type PhotoCategory = "checklist" | "startwork" | "completion";

interface CategorizedPhoto {
    url: string;
    category: PhotoCategory;
    filename: string;
}

export interface PhotoArchiveParams {
    reportNumber: string;
    branchName: string;
    bmsNIK: string;
    bmsName: string;
    storeCode: string | null;
    storeName: string;
    /** UploadThing file keys related to this report (cleanup disabled). */
    fileKeys: string[];
}

export interface PhotoArchiveResult {
    /** Google Drive store folder URL (where PDF + photo subfolders live) */
    storeFolderUrl: string;
    archivedCount: number;
    failedCount: number;
}

// Subfolder names per category
const SUBFOLDER: Record<PhotoCategory, string> = {
    checklist: "Foto Checklist",
    startwork: "Foto Mulai Pekerjaan",
    completion: "Foto Tambahan",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeDriveName(value: string): string {
    return value.replaceAll("/", "-").trim() || "-";
}

/**
 * Fetches a photo from a URL and uploads it to Google Drive.
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

        if (!response.body) {
            throw new Error("Response body is empty");
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

        return created.data.id ?? null;
    } catch {
        return null;
    }
}

// ─── Photo collection ──────────────────────────────────────────────────────────

/**
 * Collects all photo URLs from a report's JSON fields, categorized by type.
 * Categories map to separate subfolders in Google Drive.
 */
export function collectCategorizedPhotoUrls(report: {
    startSelfieUrl: string | null;
    startReceiptUrls: unknown;
    items: unknown;
    completionAdditionalPhotos: unknown;
}): CategorizedPhoto[] {
    const photos: CategorizedPhoto[] = [];

    const parseJsonStringArray = (raw: unknown): string[] => {
        if (Array.isArray(raw))
            return raw.filter((u): u is string => typeof u === "string" && !!u);
        return [];
    };

    // Start selfie
    if (report.startSelfieUrl) {
        const raw = report.startSelfieUrl.trim();
        const urls = raw.startsWith("[")
            ? (() => {
                  try {
                      const parsed: unknown = JSON.parse(raw);
                      return Array.isArray(parsed)
                          ? parsed.filter(
                                (u): u is string =>
                                    typeof u === "string" && !!u,
                            )
                          : [];
                  } catch {
                      return [];
                  }
              })()
            : [raw];
        urls.forEach((url, i) =>
            photos.push({
                url,
                category: "startwork",
                filename: `selfie-${String(i + 1).padStart(3, "0")}.jpg`,
            }),
        );
    }

    // Start receipt (nota)
    parseJsonStringArray(report.startReceiptUrls).forEach((url, i) =>
        photos.push({
            url,
            category: "startwork",
            filename: `nota-${String(i + 1).padStart(3, "0")}.jpg`,
        }),
    );

    // Item photos (checklist)
    if (Array.isArray(report.items)) {
        let checklistIdx = 1;
        for (const item of report.items as Record<string, unknown>[]) {
            if (typeof item.photoUrl === "string" && item.photoUrl) {
                const itemId =
                    typeof item.itemId === "string" ? item.itemId : "item";
                photos.push({
                    url: item.photoUrl,
                    category: "checklist",
                    filename: `${itemId}-${String(checklistIdx).padStart(3, "0")}.jpg`,
                });
                checklistIdx++;
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

    // Completion photos
    parseJsonStringArray(report.completionAdditionalPhotos).forEach((url, i) =>
        photos.push({
            url,
            category: "completion",
            filename: `completion-${String(i + 1).padStart(3, "0")}.jpg`,
        }),
    );

    // Deduplicate by URL
    const seen = new Set<string>();
    return photos.filter(({ url }) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
    });
}

/**
 * @deprecated Use collectCategorizedPhotoUrls instead.
 * Kept for backwards compatibility with any existing callers.
 */
export function collectReportPhotoUrls(report: {
    startSelfieUrl: string | null;
    startReceiptUrls: unknown;
    items: unknown;
    completionAdditionalPhotos: unknown;
}): string[] {
    return collectCategorizedPhotoUrls(report).map((p) => p.url);
}

// ─── Main archive function ─────────────────────────────────────────────────────

/**
 * Archives all UploadThing photos for a COMPLETED report to Google Drive.
 *
 * Folder structure:
 *   Laporan Maintenance/[branch]/[bmsNIK]-[bmsName]/[storeCode]-[storeName]/
 *     Foto Checklist/   ← checklist item photos
 *     Foto Start Work/  ← selfie + nota
 *     Foto Completion/  ← completion documentation
 *
 * Flow:
 * 1. Build path to the existing store folder (where PDF is already stored).
 * 2. For each categorized photo, ensure the correct subfolder exists.
 * 3. Download from UploadThing and upload to Drive.
 *
 * This is intentionally fire-and-forget from `approveFinal` — errors are
 * logged but never thrown, preserving the approval flow.
 */
export async function archiveReportPhotosToGoogleDrive(
    params: PhotoArchiveParams,
    categorizedPhotos: CategorizedPhoto[],
): Promise<PhotoArchiveResult> {
    const { drive } = getGoogleDriveClient();

    const branchName = sanitizeDriveName(params.branchName);
    const bmsFolder = `${sanitizeDriveName(params.bmsNIK)}-${sanitizeDriveName(params.bmsName)}`;
    const storeFolderName = `${sanitizeDriveName(params.storeCode ?? "-")}-${sanitizeDriveName(params.storeName)}`;
    const reportFolderName = sanitizeDriveName(params.reportNumber);

    // The store folder path — same as where the final PDF is stored.
    // Ensures photos live alongside the PDF in one cohesive folder.
    const storeFolderSegments = [
        "Laporan Maintenance",
        branchName,
        bmsFolder,
        storeFolderName,
        reportFolderName,
    ];

    const storeFolderId = await ensureDriveFolderPath(storeFolderSegments);
    const storeFolderUrl = `https://drive.google.com/drive/folders/${storeFolderId}`;

    // Cache subfolder IDs to avoid redundant Drive API calls
    const subfolderIdCache = new Map<PhotoCategory, string>();

    const getSubfolderId = async (cat: PhotoCategory): Promise<string> => {
        const cached = subfolderIdCache.get(cat);
        if (cached) return cached;
        const id = await ensureDriveFolderPath([
            ...storeFolderSegments,
            SUBFOLDER[cat],
        ]);
        subfolderIdCache.set(cat, id);
        return id;
    };

    let archivedCount = 0;
    let failedCount = 0;

    // Archive each photo sequentially to avoid Drive API rate limits
    for (const photo of categorizedPhotos) {
        logger.info(
            {
                operation: "archiveReportPhotos",
                reportNumber: params.reportNumber,
                category: photo.category,
                filename: photo.filename,
                total: categorizedPhotos.length,
            },
            "Archiving photo to Drive",
        );

        const folderId = await getSubfolderId(photo.category);
        const fileId = await uploadPhotoToDriveFolder(
            drive,
            photo.url,
            folderId,
            photo.filename,
        );

        if (fileId) {
            archivedCount++;
        } else {
            failedCount++;
            logger.warn(
                {
                    operation: "archiveReportPhotos",
                    reportNumber: params.reportNumber,
                    category: photo.category,
                    filename: photo.filename,
                    url: photo.url,
                },
                "Failed to archive single photo to Drive",
            );
        }
    }

    if (failedCount > 0) {
        logger.warn(
            {
                operation: "archiveReportPhotos",
                reportNumber: params.reportNumber,
                failedCount,
                archivedCount,
            },
            "Some photos failed to archive; UploadThing files are kept",
        );
    } else if (params.fileKeys.length > 0) {
        logger.info(
            {
                operation: "archiveReportPhotos",
                reportNumber: params.reportNumber,
                keyCount: params.fileKeys.length,
            },
            "UploadThing cleanup skipped by policy: files are kept after archive",
        );
    }

    return { storeFolderUrl, archivedCount, failedCount };
}
