import { Readable } from "stream";
import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { buildCdnUrl } from "@/lib/storage/photo-url";
import { logger } from "@/lib/logger";

const MAX_UPLOAD_RETRIES = 3;
const RETRY_DELAY_MS = [500, 1000, 2000]; // exponential backoff

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
    fileName: string,
): Promise<DrivePhotoUploadOutcome> {
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
        try {
            const result = await attemptUpload(blob, fileName);
            return { success: true, ...result };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            logger.warn(
                {
                    operation: "uploadPhotoToDriveCdn",
                    attempt,
                    maxAttempts: MAX_UPLOAD_RETRIES,
                    fileName,
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
    fileName: string,
): Promise<DrivePhotoUploadResult> {
    const { drive, config } = getDriveCdnClient();

    // Convert Blob/File to Node.js Readable stream
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const contentType = blob.type || "image/jpeg";

    // Upload file to Drive CDN root folder
    const created = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [config.rootFolderId],
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

    // CRITICAL: Set public sharing permission
    // Without this, file will return 403 Forbidden
    let permissionSet = false;
    let lastError: any = null;

    // Try up to 3 times to set permission
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            logger.info(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                    attempt,
                },
                "Attempting to set public permission",
            );

            await drive.permissions.create({
                fileId,
                requestBody: {
                    role: "reader",
                    type: "anyone",
                },
                supportsAllDrives: true,
            });

            permissionSet = true;
            logger.info(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                },
                "Successfully set public permission",
            );
            break;
        } catch (permError) {
            lastError = permError;
            logger.warn(
                {
                    operation: "uploadPhotoToDriveCdn.setPermission",
                    fileId,
                    fileName,
                    attempt,
                    errorMessage:
                        permError instanceof Error
                            ? permError.message
                            : String(permError),
                    errorCode:
                        permError &&
                        typeof permError === "object" &&
                        "code" in permError
                            ? (permError as any).code
                            : undefined,
                },
                "Failed to set public permission",
            );

            if (attempt < 3) {
                await sleep(500 * attempt); // Backoff: 500ms, 1000ms
            }
        }
    }

    // If permission setting failed after all retries, throw error
    if (!permissionSet) {
        logger.error(
            {
                operation: "uploadPhotoToDriveCdn.setPermission",
                fileId,
                fileName,
                errorMessage:
                    lastError instanceof Error
                        ? lastError.message
                        : String(lastError),
            },
            "Failed to set public permission after 3 attempts - file will not be accessible",
        );

        // Delete the file since it's not usable
        try {
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
        } catch (deleteError) {
            // Ignore delete errors
        }

        throw new Error(
            `Failed to set public permission: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        );
    }

    const url = buildCdnUrl(fileId);

    return { fileId, url };
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
