/**
 * One-time cleanup script for old Notification rows.
 *
 * Usage:
 *   npx tsx scripts/one-time-cleanup-notifications.ts           # dry-run
 *   npx tsx scripts/one-time-cleanup-notifications.ts --confirm # execute delete
 */

import prisma from "@/lib/prisma";

const RETENTION_DAYS = parseInt(
    process.env.NOTIFICATION_RETENTION_DAYS ?? "7",
    10,
);

async function main() {
    const isDryRun = !process.argv.includes("--confirm");

    const threshold = new Date(
        Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    console.log("=== Notification Cleanup Script ===");
    console.log(`Retention: ${RETENTION_DAYS} days`);
    console.log(`Threshold: ${threshold.toISOString()}`);
    console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "EXECUTE DELETE"}`);
    console.log("");

    // Count rows that will be deleted
    const count = await prisma.notification.count({
        where: { createdAt: { lt: threshold } },
    });

    console.log(`Rows to delete: ${count}`);

    if (isDryRun) {
        console.log("");
        console.log("Dry run complete. To execute, run:");
        console.log(
            "  npx tsx scripts/one-time-cleanup-notifications.ts --confirm",
        );
        await prisma.$disconnect();
        return;
    }

    console.log("Executing delete...");
    const result = await prisma.notification.deleteMany({
        where: { createdAt: { lt: threshold } },
    });

    console.log(`Deleted: ${result.count} rows`);
    console.log("Done.");

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});
