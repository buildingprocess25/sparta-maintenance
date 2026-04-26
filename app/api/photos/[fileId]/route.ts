import { NextRequest, NextResponse } from "next/server";
import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { logger } from "@/lib/logger";

/**
 * GET /api/photos/[fileId]
 * 
 * Proxies Google Drive file access through our server.
 * This solves the 403 Forbidden issue when accessing Drive files directly.
 * 
 * Server fetches file using OAuth credentials, then streams to client.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } },
) {
    try {
        const { fileId } = params;

        if (!fileId) {
            return NextResponse.json(
                { error: "File ID is required" },
                { status: 400 },
            );
        }

        const { drive } = getDriveCdnClient();

        // Get file metadata
        const file = await drive.files.get({
            fileId,
            fields: "mimeType,size",
            supportsAllDrives: true,
        });

        const mimeType = file.data.mimeType || "image/jpeg";

        // Get file content as stream
        const response = await drive.files.get(
            {
                fileId,
                alt: "media",
                supportsAllDrives: true,
            },
            { responseType: "stream" },
        );

        // Convert Node.js stream to Web ReadableStream
        const stream = response.data as any;
        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk: Buffer) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                stream.on("end", () => {
                    controller.close();
                });
                stream.on("error", (error: Error) => {
                    controller.error(error);
                });
            },
        });

        return new NextResponse(webStream, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        logger.error(
            {
                operation: "GET /api/photos/[fileId]",
                fileId: params.fileId,
                errorMessage:
                    error instanceof Error ? error.message : String(error),
            },
            "Failed to fetch photo from Drive",
        );

        return NextResponse.json(
            { error: "Failed to fetch photo" },
            { status: 500 },
        );
    }
}
