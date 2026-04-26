import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadPhotoToDriveCdn } from "@/lib/storage/drive-photo-service";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
];

/**
 * POST /api/photos/upload
 *
 * Uploads a photo to Google Drive CDN.
 * Requires BMS role authentication.
 *
 * Request: multipart/form-data with 'file' field
 * Response: { url: string; fileId: string } on success
 * Errors: 400 (invalid file), 401 (unauthenticated), 403 (wrong role), 500 (upload failed)
 *
 * NOTE: Client is responsible for compression before upload.
 */
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthenticated" },
                { status: 401 },
            );
        }

        if (session.role !== "BMS") {
            return NextResponse.json(
                { error: "Forbidden - BMS role required" },
                { status: 403 },
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: "No file provided or invalid file" },
                { status: 400 },
            );
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
                },
                { status: 400 },
            );
        }

        // Validate file size (should already be compressed by client)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
                },
                { status: 400 },
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).slice(2, 9);
        const extension = getFileExtension(file.name) || "jpg";
        const fileName = `photo-${timestamp}-${randomId}.${extension}`;

        // Upload to Drive CDN (file is already compressed by client)
        const uploadResult = await uploadPhotoToDriveCdn(file, fileName);

        if (!uploadResult.success) {
            logger.error(
                {
                    operation: "POST /api/photos/upload",
                    userId: session.userId,
                    fileName,
                    error: uploadResult.error,
                },
                "Failed to upload photo to Drive CDN",
            );

            return NextResponse.json(
                { error: "Failed to upload photo" },
                { status: 500 },
            );
        }

        logger.info(
            {
                operation: "POST /api/photos/upload",
                userId: session.userId,
                fileName,
                fileId: uploadResult.fileId,
                url: uploadResult.url,
            },
            "Photo uploaded to Drive CDN successfully",
        );

        return NextResponse.json({
            url: uploadResult.url,
            fileId: uploadResult.fileId,
        });
    } catch (error) {
        logger.error(
            {
                operation: "POST /api/photos/upload",
                errorMessage:
                    error instanceof Error ? error.message : String(error),
            },
            "Unexpected error in photo upload API",
        );

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

function getFileExtension(fileName: string): string | null {
    const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() ?? null;
}
