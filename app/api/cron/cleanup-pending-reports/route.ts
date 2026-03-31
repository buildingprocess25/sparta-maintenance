import { NextRequest, NextResponse } from "next/server";
import { cleanupPendingReports } from "@/lib/jobs/cleanup-pending-reports";
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
            { operation: "cron.cleanupPendingReports" },
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
        const result = await cleanupPendingReports();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error(
            { operation: "cron.cleanupPendingReports" },
            "Cleanup cron job failed",
            error,
        );
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
