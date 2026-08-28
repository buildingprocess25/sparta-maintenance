import { Readable } from "stream";
import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { buildCdnUrl } from "@/lib/storage/photo-url";
import { logger } from "@/lib/logger";

const MAX_UPLOAD_RETRIES = 3;
const RETRY_DELAY_MS = [500, 1000, 2000]; // exponential backoff
const DRIVE_CDN_SHARE_MODE = (
    process.env.DRIVE_CDN_SHARE_MODE ?? "private"
).toLowerCase();
const DRIVE_CDN_SHARE_DOMAIN = process.env.DRIVE_CDN_SHARE_DOMAIN;

export type DrivePhotoUploadResult = {
    fileId: string;
    url: string; // CDN URL
};

export type DrivePhotoUploadFailure = {
    success: false;
    error: string;
};

export type DrivePhotoUploadOutcome =
    | ({ success: true } & DrivePhotoUploadResult)
    | DrivePhotoUploadFailure;

/**
 * Uploads a pre-compressed image Blob/File to Google Drive CDN.
 * Sets public sharing permission automatically.
 * Retries up to MAX_UPLOAD_RETRIES times on failure.
 * Does NOT re-compress — caller is responsible for compression.
 */
export async function uploadPhotoToDriveCdn(
    blob: Blob | File,
    input: { parentFolderId: string; fileName: string },
): Promise<DrivePhotoUploadOutcome> {
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
        try {
            const result = await attemptUpload(blob, input);
            return { success: true, ...result };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            logger.warn(
                {
                    operation: "uploadPhotoToDriveCdn",
                    attempt,
                    maxAttempts: MAX_UPLOAD_RETRIES,
                    fileName: input.fileName,
                    errorMessage,
                },
                "Upload photo to Drive CDN failed on attempt",
            );

            if (attempt < MAX_UPLOAD_RETRIES) {
                const delay = RETRY_DELAY_MS[attempt - 1] ?? 2000;
                await sleep(delay);
            } else {
                return {
                    success: false,
                    error: `Failed after ${MAX_UPLOAD_RETRIES} attempts: ${errorMessage}`,
                };
            }
        }
    }

    return {
        success: false,
        error: `Failed after ${MAX_UPLOAD_RETRIES} attempts`,
    };
}

async function attemptUpload(
    blob: Blob | File,
    input: { parentFolderId: string; fileName: string },
): Promise<DrivePhotoUploadResult> {
    const { drive } = getDriveCdnClient();

    // Convert Blob/File to Node.js Readable stream
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const contentType = blob.type || "image/jpeg";

    const created = await drive.files.create({
        requestBody: {
            name: input.fileName,
            parents: [input.parentFolderId],
            mimeType: contentType,
        },
        media: {
            mimeType: contentType,
            body: stream,
        },
        fields: "id",
        supportsAllDrives: true,
    });

    const fileId = created.data.id;
    if (!fileId) {
        throw new Error("Google Drive create returned empty file ID");
    }

    await applyConfiguredSharing(fileId, input.fileName);

    const url = buildCdnUrl(fileId);

    return { fileId, url };
}

async function applyConfiguredSharing(
    fileId: string,
    fileName: string,
): Promise<void> {
    if (DRIVE_CDN_SHARE_MODE === "private") {
        // logger.info(
        //     {
        //         operation: "uploadPhotoToDriveCdn.setPermission",
        //         fileId,
        //         fileName,
        //         shareMode: DRIVE_CDN_SHARE_MODE,
        //     },
        //     "Skipping Drive sharing permission; photos are served through the app proxy",
        // );
        return;
    }

    const { drive } = getDriveCdnClient();
    const requestBody =
        DRIVE_CDN_SHARE_MODE === "domain"
            ? {
                  role: "reader",
                  type: "domain",
                  domain: DRIVE_CDN_SHARE_DOMAIN,
              }
            : {
                  role: "reader",
                  type: "anyone",
              };

    if (DRIVE_CDN_SHARE_MODE === "domain" && !DRIVE_CDN_SHARE_DOMAIN) {
        throw new Error(
            "DRIVE_CDN_SHARE_DOMAIN wajib diisi jika DRIVE_CDN_SHARE_MODE=domain",
        );
    }

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            logger.info(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                    attempt,
                    shareMode: DRIVE_CDN_SHARE_MODE,
                },
                "Attempting to set Drive sharing permission",
            );

            await drive.permissions.create({
                fileId,
                requestBody,
                supportsAllDrives: true,
            });

            logger.info(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                    shareMode: DRIVE_CDN_SHARE_MODE,
                },
                "Successfully set Drive sharing permission",
            );
            return;
        } catch (permError) {
            lastError = permError;
            logger.warn(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                    attempt,
                    shareMode: DRIVE_CDN_SHARE_MODE,
                    errorMessage:
                        permError instanceof Error
                            ? permError.message
                            : String(permError),
                    errorCode:
                        permError &&
                        typeof permError === "object" &&
                        "code" in permError
                            ? (permError as { code?: unknown }).code
                            : undefined,
                },
                "Failed to set Drive sharing permission",
            );

            if (attempt < 3) {
                await sleep(500 * attempt);
            }
        }
    }

    await cleanupFileWithFailedPermission(fileId);

    throw new Error(
        `Failed to set Drive sharing permission: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
}

async function cleanupFileWithFailedPermission(fileId: string): Promise<void> {
    try {
        const { drive } = getDriveCdnClient();
        await drive.files.delete({
            fileId,
            supportsAllDrives: true,
        });
        logger.info(
            {
                operation: "uploadPhotoToDriveCdn.cleanup",
                fileId,
            },
            "Deleted file with failed permission",
        );
    } catch {
        // Ignore delete errors.
    }
}

/**
 * Deletes a single file from Google Drive CDN by file ID.
 * Returns true on success, false on failure (non-throwing).
 */
export async function deletePhotoFromDriveCdn(
    fileId: string,
): Promise<boolean> {
    try {
        const { drive } = getDriveCdnClient();

        await drive.files.delete({
            fileId,
            supportsAllDrives: true,
        });

        return true;
    } catch (error) {
        logger.error(
            {
                operation: "deletePhotoFromDriveCdn",
                fileId,
                errorMessage:
                    error instanceof Error ? error.message : String(error),
            },
            "Failed to delete photo from Drive CDN",
        );

        return false;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
