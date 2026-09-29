import prisma from "../lib/prisma";



async function main() {
    console.log("Running query...");
    const rows = await prisma.$queryRaw`
        WITH report_events AS (
            SELECT 
                r."branchName",
                u."name" AS "bmsName",
                r."reportNumber",
                MAX(a."createdAt") FILTER (WHERE a.action IN ('SUBMITTED', 'RESUBMITTED_ESTIMATION')) AS t_submit,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_APPROVED') AS t_est_appv,
                MAX(a."createdAt") FILTER (WHERE a.action = 'ESTIMATION_REJECTED_REVISION') AS t_est_rev,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_STARTED') AS t_start,
                MAX(a."createdAt") FILTER (WHERE a.action IN ('COMPLETION_SUBMITTED', 'RESUBMITTED_WORK')) AS t_realisasi,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_REJECTED_REVISION') AS t_real_rev,
                MAX(a."createdAt") FILTER (WHERE a.action = 'WORK_APPROVED') AS t_real_appv,
                MAX(a."createdAt") FILTER (WHERE a.action = 'FINAL_APPROVED_BNM') AS t_mgr_appv
            FROM "Report" r
            JOIN "User" u ON r."createdByNIK" = u."NIK"
            LEFT JOIN "Store" s ON r."storeCode" = s.code
            JOIN "ActivityLog" a ON r."reportNumber" = a."reportNumber"
            GROUP BY r."branchName", u."name", r."reportNumber"
        )
        SELECT 
            "branchName",
            "bmsName",
            AVG(EXTRACT(EPOCH FROM (t_est_appv - t_submit))) AS avg_est_to_appv_bmc,
            AVG(EXTRACT(EPOCH FROM (t_est_rev - t_submit))) AS avg_est_to_rev_bmc,
            AVG(EXTRACT(EPOCH FROM (t_start - t_est_appv))) AS avg_appv_bmc_to_start,
            AVG(EXTRACT(EPOCH FROM (t_realisasi - t_start))) AS avg_start_to_realisasi,
            AVG(EXTRACT(EPOCH FROM (t_real_rev - t_realisasi))) AS avg_realisasi_to_rev_bmc,
            AVG(EXTRACT(EPOCH FROM (t_real_appv - t_realisasi))) AS avg_realisasi_to_appv_bmc,
            AVG(EXTRACT(EPOCH FROM (t_mgr_appv - t_real_appv))) AS avg_appv_bmc_to_mgr
        FROM report_events
        GROUP BY "branchName", "bmsName"
        ORDER BY "branchName", "bmsName"
        LIMIT 10
    `;
    console.log("Rows:", JSON.stringify(rows, null, 2));
    
    // Check if there are any activity logs at all
    const acts = await prisma.activityLog.count();
    console.log("Total ActivityLogs:", acts);
    
    // Check report count
    const reps = await prisma.report.count();
    console.log("Total Reports:", reps);
    
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

