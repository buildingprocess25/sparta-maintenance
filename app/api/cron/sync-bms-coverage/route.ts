import { NextRequest, NextResponse } from "next/server";
import { syncBmsCoverageFromSheet } from "@/lib/jobs/sync-bms-coverage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
    if (!process.env.CRON_SECRET) {
        logger.error(
            { operation: "cron.syncBmsCoverage" },
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
        const result = await syncBmsCoverageFromSheet();
        logger.info(
            { operation: "cron.syncBmsCoverage", summary: result },
            "BMS Coverage Sync Cron Job Completed Successfully",
        );
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error(
            { operation: "cron.syncBmsCoverage" },
            "BMS Coverage sync cron job failed",
            error,
        );
        return NextResponse.json(
            { error: "BMS Coverage sync failed" },
            { status: 500 },
        );
    }
}
