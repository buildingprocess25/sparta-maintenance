import { NextRequest, NextResponse } from "next/server";
import { syncStoresFromSheet } from "@/lib/jobs/sync-stores";
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
            { operation: "cron.syncStores" },
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
        const result = await syncStoresFromSheet();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        logger.error(
            { operation: "cron.syncStores" },
            "Store sync cron job failed",
            error,
        );
        return NextResponse.json({ error: "Store sync failed" }, { status: 500 });
    }
}
