/**
 * Manual runner for pending-report cleanup job.
 *
 * Run:
 *   npx tsx scripts/cleanup-pending-reports.ts
 */

import { cleanupPendingReports } from "@/lib/jobs/cleanup-pending-reports";

async function main() {
    const result = await cleanupPendingReports();

    console.log("✅ Cleanup completed");
    console.log(`- Cutoff date      : ${result.cutoffDate}`);
    console.log(`- Reports found    : ${result.reportsFound}`);
    console.log(`- Reports deleted  : ${result.reportsDeleted}`);
    console.log(`- Photos deleted   : ${result.photosDeleted}`);
    console.log(`- Failed reports   : ${result.failedReports.length}`);

    if (result.failedReports.length > 0) {
        console.log(`  ${result.failedReports.join(", ")}`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exitCode = 1;
});
