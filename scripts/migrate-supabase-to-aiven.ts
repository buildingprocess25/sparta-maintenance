/**
 * Migration: Supabase → Aiven PostgreSQL
 *
 * Skips: User, Store (already copied)
 * Tables migrated: Report, ApprovalLog, ActivityLog, PjumExport, PjumBankAccount, GoogleDriveFolderCache
 *
 * Usage:
 *   npx tsx scripts/migrate-supabase-to-aiven.ts              # full migration
 *   npx tsx scripts/migrate-supabase-to-aiven.ts --dry-run    # validate only
 */

import "dotenv/config";
import pg from "pg";
import prisma from "../lib/prisma.js";

const { Client } = pg;

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

const SUPABASE_URL =
    "postgresql://postgres.awnxdtzmwfatyqutbids:spartaalfamart@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function connectSupabase(): Promise<pg.Client> {
    const client = new Client({
        connectionString: SUPABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    log("✅ Connected to Supabase");
    return client;
}

async function readBatch<T>(
    client: pg.Client,
    table: string,
    offset: number,
    columns = "*",
): Promise<T[]> {
    const res = await client.query(
        `SELECT ${columns} FROM "${table}" ORDER BY "createdAt" LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset],
    );
    return res.rows as T[];
}

// ─── Clear Aiven tables (reverse FK order) ───────────────────────────────────

async function clearAivenTables() {
    log("🗑️  Clearing Aiven tables (reverse FK order)...");

    if (DRY_RUN) {
        log("  [DRY RUN] Skipping delete");
        return;
    }

    // Must delete in this order to respect FK constraints
    await prisma.activityLog.deleteMany({});
    log("  ✓ ActivityLog cleared");

    await prisma.approvalLog.deleteMany({});
    log("  ✓ ApprovalLog cleared");

    await prisma.pjumBankAccount.deleteMany({});
    log("  ✓ PjumBankAccount cleared");

    await prisma.pjumExport.deleteMany({});
    log("  ✓ PjumExport cleared");

    await prisma.googleDriveFolderCache.deleteMany({});
    log("  ✓ GoogleDriveFolderCache cleared");

    await prisma.report.deleteMany({});
    log("  ✓ Report cleared");
}

// ─── Migrate Report ──────────────────────────────────────────────────────────

async function migrateReports(src: pg.Client) {
    log("\n📋 Migrating Report...");
    let offset = 0;
    let total = 0;

    while (true) {
        const rows = await readBatch<Record<string, unknown>>(src, "Report", offset);
        if (rows.length === 0) break;

        if (!DRY_RUN) {
            for (const row of rows) {
                await prisma.report.upsert({
                    where: { reportNumber: row.reportNumber as string },
                    create: {
                        reportNumber: row.reportNumber as string,
                        branchName: row.branchName as string,
                        storeName: (row.storeName as string) ?? "",
                        storeCode: (row.storeCode as string) ?? null,
                        status: row.status as never,
                        totalEstimation: row.totalEstimation as never,
                        createdByNIK: row.createdByNIK as string,
                        items: (row.items as never) ?? [],
                        estimations: (row.estimations as never) ?? [],
                        startSelfieUrl: (row.startSelfieUrl as string) ?? null,
                        startReceiptUrls: (row.startReceiptUrls as never) ?? [],
                        startMaterialStores: (row.startMaterialStores as never) ?? [],
                        completionNotes: (row.completionNotes as string) ?? null,
                        completionAdditionalPhotos: (row.completionAdditionalPhotos as never) ?? [],
                        completionAdditionalNote: (row.completionAdditionalNote as string) ?? null,
                        finishedAt: row.finishedAt ? new Date(row.finishedAt as string) : null,
                        pjumExportedAt: row.pjumExportedAt ? new Date(row.pjumExportedAt as string) : null,
                        pendingEstimationPdfPath: (row.pendingEstimationPdfPath as string) ?? null,
                        estimationApprovedPdfPath: (row.estimationApprovedPdfPath as string) ?? null,
                        approvedBmcPdfPath: (row.approvedBmcPdfPath as string) ?? null,
                        completedPdfPath: (row.completedPdfPath as string) ?? null,
                        pdfSnapshotMeta: (row.pdfSnapshotMeta as never) ?? {},
                        // Inject default for new column not in Supabase
                        uploadthingFileKeys: [],
                        reportFinalDriveUrl: (row.reportFinalDriveUrl as string) ?? null,
                        createdAt: new Date(row.createdAt as string),
                        updatedAt: new Date(row.updatedAt as string),
                    },
                    update: {},
                });
            }
        }

        total += rows.length;
        log(`  → ${total} rows processed`);
        offset += BATCH_SIZE;
        if (rows.length < BATCH_SIZE) break;
    }

    log(`✅ Report: ${total} rows migrated`);
    return total;
}

// ─── Migrate ApprovalLog ─────────────────────────────────────────────────────

async function migrateApprovalLogs(src: pg.Client) {
    log("\n📋 Migrating ApprovalLog...");
    let offset = 0;
    let total = 0;

    while (true) {
        const rows = await readBatch<Record<string, unknown>>(src, "ApprovalLog", offset);
        if (rows.length === 0) break;

        if (!DRY_RUN) {
            for (const row of rows) {
                await prisma.approvalLog.upsert({
                    where: { id: row.id as string },
                    create: {
                        id: row.id as string,
                        reportNumber: row.reportNumber as string,
                        approverNIK: row.approverNIK as string,
                        status: row.status as never,
                        notes: (row.notes as string) ?? null,
                        createdAt: new Date(row.createdAt as string),
                    },
                    update: {},
                });
            }
        }

        total += rows.length;
        offset += BATCH_SIZE;
        if (rows.length < BATCH_SIZE) break;
    }

    log(`✅ ApprovalLog: ${total} rows migrated`);
    return total;
}

// ─── Migrate ActivityLog ─────────────────────────────────────────────────────

async function migrateActivityLogs(src: pg.Client) {
    log("\n📋 Migrating ActivityLog...");
    let offset = 0;
    let total = 0;

    while (true) {
        const rows = await readBatch<Record<string, unknown>>(src, "ActivityLog", offset);
        if (rows.length === 0) break;

        if (!DRY_RUN) {
            for (const row of rows) {
                await prisma.activityLog.upsert({
                    where: { id: row.id as string },
                    create: {
                        id: row.id as string,
                        reportNumber: row.reportNumber as string,
                        actorNIK: row.actorNIK as string,
                        action: row.action as never,
                        notes: (row.notes as string) ?? null,
                        createdAt: new Date(row.createdAt as string),
                    },
                    update: {},
                });
            }
        }

        total += rows.length;
        offset += BATCH_SIZE;
        if (rows.length < BATCH_SIZE) break;
    }

    log(`✅ ActivityLog: ${total} rows migrated`);
    return total;
}

// ─── Migrate PjumExport ──────────────────────────────────────────────────────

async function migratePjumExports(src: pg.Client) {
    log("\n📋 Migrating PjumExport...");

    // PjumExport has no createdAt in some versions — use id order
    const res = await src.query(`SELECT * FROM "PjumExport" ORDER BY "createdAt"`);
    const rows = res.rows;

    if (!DRY_RUN) {
        for (const row of rows) {
            await prisma.pjumExport.upsert({
                where: { id: row.id as string },
                create: {
                    id: row.id as string,
                    status: row.status as never,
                    bmsNIK: row.bmsNIK as string,
                    branchName: row.branchName as string,
                    weekNumber: row.weekNumber as number,
                    fromDate: new Date(row.fromDate as string),
                    toDate: new Date(row.toDate as string),
                    reportNumbers: (row.reportNumbers as string[]) ?? [],
                    createdByNIK: row.createdByNIK as string,
                    approvedByNIK: (row.approvedByNIK as string) ?? null,
                    approvedAt: row.approvedAt ? new Date(row.approvedAt as string) : null,
                    pumBankAccountNo: (row.pumBankAccountNo as string) ?? null,
                    pumBankAccountName: (row.pumBankAccountName as string) ?? null,
                    pumBankName: (row.pumBankName as string) ?? null,
                    pumWeekNumber: (row.pumWeekNumber as number) ?? null,
                    pumMonth: (row.pumMonth as string) ?? null,
                    pumYear: (row.pumYear as number) ?? null,
                    rejectionNotes: (row.rejectionNotes as string) ?? null,
                    pjumPdfPath: (row.pjumPdfPath as string) ?? null,
                    pjumFinalDriveUrl: (row.pjumFinalDriveUrl as string) ?? null,
                    createdAt: new Date(row.createdAt as string),
                    updatedAt: new Date(row.updatedAt as string),
                },
                update: {},
            });
        }
    }

    log(`✅ PjumExport: ${rows.length} rows migrated`);
    return rows.length;
}

// ─── Migrate GoogleDriveFolderCache ──────────────────────────────────────────

async function migrateGoogleDriveFolderCache(src: pg.Client) {
    log("\n📋 Migrating GoogleDriveFolderCache...");

    const res = await src.query(`SELECT * FROM "GoogleDriveFolderCache"`);
    const rows = res.rows;

    if (!DRY_RUN) {
        for (const row of rows) {
            await prisma.googleDriveFolderCache.upsert({
                where: { cacheKey: row.cacheKey as string },
                create: {
                    id: row.id as string,
                    cacheKey: row.cacheKey as string,
                    folderId: row.folderId as string,
                    createdAt: new Date(row.createdAt as string),
                    updatedAt: new Date(row.updatedAt as string),
                },
                update: {
                    folderId: row.folderId as string,
                    updatedAt: new Date(row.updatedAt as string),
                },
            });
        }
    }

    log(`✅ GoogleDriveFolderCache: ${rows.length} rows migrated`);
    return rows.length;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("=".repeat(60));
    console.log("  SPARTA: Supabase → Aiven Migration");
    console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
    console.log("=".repeat(60));

    const src = await connectSupabase();

    try {
        // Step 1: Clear Aiven tables (except User & Store — already copied)
        await clearAivenTables();

        // Step 2: Migrate in FK order
        const counts = {
            reports: await migrateReports(src),
            approvalLogs: await migrateApprovalLogs(src),
            activityLogs: await migrateActivityLogs(src),
            pjumExports: await migratePjumExports(src),
            driveCache: await migrateGoogleDriveFolderCache(src),
        };

        console.log("\n" + "=".repeat(60));
        console.log("  Migration Summary");
        console.log("=".repeat(60));
        for (const [table, count] of Object.entries(counts)) {
            console.log(`  ${table.padEnd(20)}: ${count} rows`);
        }
        console.log(`  Mode: ${DRY_RUN ? "DRY RUN — no data written" : "LIVE — data written to Aiven"}`);
        console.log("=".repeat(60));
    } finally {
        await src.end();
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
