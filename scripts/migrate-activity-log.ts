/**
 * One-time migration script: populate ActivityLog from existing data.
 *
 * Run with:  npx tsx scripts/migrate-activity-log.ts
 *
 * What it does:
 * 1. For every non-DRAFT Report → insert ActivityLog SUBMITTED
 * 2. Maps every ApprovalLog row to an ActivityLog row with the correct action
 * 3. Deletes ApprovalLog rows whose status is not an approval/rejection decision
 *    (i.e. removes PENDING_ESTIMATION, IN_PROGRESS, PENDING_REVIEW entries)
 */

import { PrismaClient, ActivityAction } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Map ApprovalLog.status → ActivityAction
function mapStatus(
    status: string,
    prevStatus: string | null,
): ActivityAction | null {
    switch (status) {
        case "PENDING_ESTIMATION":
            // All PENDING_ESTIMATION rows in ApprovalLog come from resubmit.ts
            return ActivityAction.RESUBMITTED_ESTIMATION;
        case "IN_PROGRESS":
            return ActivityAction.WORK_STARTED;
        case "PENDING_REVIEW":
            return prevStatus === "REVIEW_REJECTED_REVISION"
                ? ActivityAction.RESUBMITTED_WORK
                : ActivityAction.COMPLETION_SUBMITTED;
        case "ESTIMATION_APPROVED":
            return ActivityAction.ESTIMATION_APPROVED;
        case "ESTIMATION_REJECTED_REVISION":
            return ActivityAction.ESTIMATION_REJECTED_REVISION;
        case "ESTIMATION_REJECTED":
            return ActivityAction.ESTIMATION_REJECTED;
        case "APPROVED_BMC":
            return ActivityAction.WORK_APPROVED;
        case "REVIEW_REJECTED_REVISION":
            return ActivityAction.WORK_REJECTED_REVISION;
        case "COMPLETED":
            return ActivityAction.FINALIZED;
        default:
            return null;
    }
}

const DECISION_STATUSES = new Set([
    "ESTIMATION_APPROVED",
    "ESTIMATION_REJECTED_REVISION",
    "ESTIMATION_REJECTED",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
    "COMPLETED",
]);

async function main() {
    console.log("Starting ActivityLog migration...");

    // ── 1. Submitted entries from Report table ──────────────────────────────
    const nonDraftReports = await prisma.report.findMany({
        where: { status: { not: "DRAFT" } },
        select: {
            reportNumber: true,
            createdByNIK: true,
            createdAt: true,
            logs: {
                orderBy: { createdAt: "asc" },
                take: 1,
                select: { createdAt: true },
            },
        },
    });

    console.log(
        `Found ${nonDraftReports.length} non-DRAFT reports to create SUBMITTED entries for.`,
    );

    for (const report of nonDraftReports) {
        // Place SUBMITTED 1ms before the first approval log, or use report.createdAt
        const submittedAt =
            report.logs.length > 0
                ? new Date(report.logs[0].createdAt.getTime() - 1)
                : report.createdAt;

        await prisma.activityLog.upsert({
            where: {
                // Use a stable compound key we derive so re-runs are idempotent
                // We don't have a unique constraint, so check manually
                id: `submitted-${report.reportNumber}`,
            },
            update: {},
            create: {
                id: `submitted-${report.reportNumber}`,
                reportNumber: report.reportNumber,
                actorNIK: report.createdByNIK,
                action: ActivityAction.SUBMITTED,
                notes: null,
                createdAt: submittedAt,
            },
        });
    }
    console.log("✓ SUBMITTED entries created.");

    // ── 2. Map existing ApprovalLog rows → ActivityLog ──────────────────────
    // Fetch all approval logs ordered by report + time to determine prev status
    const allLogs = await prisma.approvalLog.findMany({
        orderBy: [{ reportNumber: "asc" }, { createdAt: "asc" }],
        select: {
            id: true,
            reportNumber: true,
            approverNIK: true,
            status: true,
            notes: true,
            createdAt: true,
        },
    });

    console.log(`Found ${allLogs.length} ApprovalLog rows to migrate.`);

    let activityCreated = 0;
    const prevStatusByReport: Record<string, string> = {};

    for (const log of allLogs) {
        const prevStatus = prevStatusByReport[log.reportNumber] ?? null;
        const action = mapStatus(log.status as string, prevStatus);

        prevStatusByReport[log.reportNumber] = log.status as string;

        if (!action) {
            console.warn(
                `  Unrecognized status "${log.status}" for log ${log.id} — skipped`,
            );
            continue;
        }

        await prisma.activityLog.upsert({
            where: { id: `log-${log.id}` },
            update: {},
            create: {
                id: `log-${log.id}`,
                reportNumber: log.reportNumber,
                actorNIK: log.approverNIK,
                action,
                notes: log.notes,
                createdAt: log.createdAt,
            },
        });
        activityCreated++;
    }
    console.log(`✓ ${activityCreated} ActivityLog entries created from logs.`);

    // ── 3. Delete non-decision rows from ApprovalLog ────────────────────────
    const deleted = await prisma.approvalLog.deleteMany({
        where: {
            status: {
                notIn: Array.from(DECISION_STATUSES) as any,
            },
        },
    });
    console.log(`✓ Deleted ${deleted.count} non-decision ApprovalLog rows.`);

    console.log("Migration complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
