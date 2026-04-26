import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * DEBUG ONLY - Test if a Google Drive CDN URL is accessible
 * DELETE THIS FILE after debugging
 * 
 * Usage: GET /api/photos/test-url?url=https://lh3.googleusercontent.com/d/FILE_ID
 */
export async function GET(request: NextRequest) {
    const session = await getSession();
    
    if (!session || session.role !== "BMS") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    
    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
        // Try to fetch the image
        const response = await fetch(url);
        
        return NextResponse.json({
            url,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get("content-type"),
            contentLength: response.headers.get("content-length"),
            accessible: response.ok,
        });
    } catch (error) {
        return NextResponse.json({
            url,
            error: error instanceof Error ? error.message : String(error),
            accessible: false,
        });
    }
}
