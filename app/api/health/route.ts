import { NextResponse } from "next/server";

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
    return NextResponse.json(
        {
            status: "ok",
            service: "sparta-maintenance",
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: NO_CACHE_HEADERS,
        },
    );
}

export async function HEAD() {
    return new Response(null, {
        status: 200,
        headers: NO_CACHE_HEADERS,
    });
}
