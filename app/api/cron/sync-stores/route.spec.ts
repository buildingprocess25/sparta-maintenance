import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "./route";

async function main() {
    const originalCronSecret = process.env.CRON_SECRET;

    try {
        delete process.env.CRON_SECRET;

        const misconfiguredResponse = await POST(
            new NextRequest("http://localhost/api/cron/sync-stores", {
                method: "POST",
            }),
        );
        assert.equal(misconfiguredResponse.status, 500);

        process.env.CRON_SECRET = "test-cron-secret";

        const unauthorizedResponse = await POST(
            new NextRequest("http://localhost/api/cron/sync-stores", {
                method: "POST",
            }),
        );
        assert.equal(unauthorizedResponse.status, 401);
    } finally {
        if (originalCronSecret === undefined) {
            delete process.env.CRON_SECRET;
        } else {
            process.env.CRON_SECRET = originalCronSecret;
        }
    }

    console.log("sync stores cron route tests passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
