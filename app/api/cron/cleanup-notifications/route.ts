import { NextRequest, NextResponse } from "next/server";
import { cleanupOldNotifications } from "@/lib/jobs/cleanup-notifications";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const authHeader = request.headers.get("authorization");
    return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
    if (!process.env.CRON_SECRET) {
        logger.error(
            { operation: "cron.cleanupNotifications" },
            "CRON_SECRET is not configured",
        );
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 },
        );
    }

    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await cleanupOldNotifications();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error(
            { operation: "cron.cleanupNotifications" },
            "Notification cleanup cron job failed",
            error,
        );
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 },
        );
    }
}
