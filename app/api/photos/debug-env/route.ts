import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * DEBUG ONLY - Check if Drive CDN env vars are loaded
 * DELETE THIS FILE after debugging
 */
export async function GET() {
    const session = await getSession();
    
    if (!session || session.role !== "BMS") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
        DRIVE_CDN_CLIENT_ID: process.env.DRIVE_CDN_CLIENT_ID ? "✅ SET" : "❌ NOT SET",
        DRIVE_CDN_CLIENT_SECRET: process.env.DRIVE_CDN_CLIENT_SECRET ? "✅ SET" : "❌ NOT SET",
        DRIVE_CDN_REFRESH_TOKEN: process.env.DRIVE_CDN_REFRESH_TOKEN ? "✅ SET" : "❌ NOT SET",
        DRIVE_CDN_ROOT_FOLDER_ID: process.env.DRIVE_CDN_ROOT_FOLDER_ID ? "✅ SET" : "❌ NOT SET",
    });
}
