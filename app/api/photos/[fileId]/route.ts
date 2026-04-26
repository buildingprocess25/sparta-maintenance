import { NextRequest, NextResponse } from "next/server";
import { getDriveCdnClient } from "@/lib/google-drive/cdn-client";
import { logger } from "@/lib/logger";

/**
 * GET /api/photos/[fileId]
 * 
 * Proxies Google Drive file access through our server.
 * This solves 403 Forbidden and 429 rate limit issues.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ fileId: string }> },
) {
    try {
        const { fileId } = await context.params;

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
                // Aggressive caching: 1 year
                "Cache-Control": "public, max-age=31536000, immutable",
                // Allow Vercel/Cloudflare edge caching
                "CDN-Cache-Control": "public, max-age=31536000",
                // CORS headers
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
            },
        });
    } catch (error) {
        logger.error(
            {
                operation: "GET /api/photos/[fileId]",
                fileId: (await context.params).fileId,
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
