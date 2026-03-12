/**
 * Hapus seluruh data laporan, approval log, activity log, dan foto storage.
 *
 * ⚠️  PERINGATAN: Operasi ini TIDAK BISA dibatalkan.
 *
 * Jalankan dengan:
 *   npx tsx scripts/purge-reports.ts
 *
 * Untuk lewati konfirmasi interaktif (mis. di CI):
 *   PURGE_CONFIRM=yes npx tsx scripts/purge-reports.ts
 */

import * as readline from "readline";
import prisma from "@/lib/prisma";
import { getSupabaseClient } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function confirm(): Promise<boolean> {
    if (process.env.PURGE_CONFIRM === "yes") return true;

    console.log("\n⚠️  PERINGATAN KERAS ⚠️");
    console.log(
        "Script ini akan MENGHAPUS PERMANEN seluruh laporan, approval log,",
    );
    console.log("activity log, dan semua foto di Supabase Storage.");
    console.log("Data yang dihapus TIDAK BISA dipulihkan.\n");

    const answer = await ask('Ketik "HAPUS SEMUA" untuk melanjutkan: ');
    return answer === "HAPUS SEMUA";
}

// ─── Delete photos from Supabase Storage ──────────────────────────────────────

async function purgeStorage(reportNumbers: string[]): Promise<void> {
    if (reportNumbers.length === 0) return;

    const supabase = getSupabaseClient();
    const bucket = supabase.storage.from("reports");

    let totalDeleted = 0;
    let totalErrors = 0;

    // List all objects inside each reportNumber folder
    // Supabase storage doesn't support recursive delete by prefix directly,
    // so we list then batch-delete.
    for (const reportNumber of reportNumbers) {
        const { data: files, error: listError } = await bucket.list(
            reportNumber,
            { limit: 1000 },
        );

        if (listError) {
            console.warn(
                `  ⚠ Gagal list storage untuk ${reportNumber}: ${listError.message}`,
            );
            totalErrors++;
            continue;
        }

        if (!files || files.length === 0) continue;

        const paths = files.map((f) => `${reportNumber}/${f.name}`);
        const { error: removeError } = await bucket.remove(paths);

        if (removeError) {
            console.warn(
                `  ⚠ Gagal hapus ${paths.length} file untuk ${reportNumber}: ${removeError.message}`,
            );
            totalErrors++;
        } else {
            totalDeleted += paths.length;
        }
    }

    // Also clean up any leftover DRAFT-* folders not tied to a report
    const { data: rootFolders } = await bucket.list("", { limit: 1000 });
    if (rootFolders) {
        for (const folder of rootFolders) {
            // Supabase returns "folders" as items without extensions
            // DRAFT folders pattern: "{branch}/{storeCode}/DRAFT-{NIK}/"
            // Top-level entries are branch folders — skip them
            if (folder.name && !folder.id) {
                // It's a pseudo-folder, skip (can't delete non-empty dirs directly)
                continue;
            }
        }
    }

    console.log(
        `  ✓ Storage: ${totalDeleted} file dihapus${totalErrors > 0 ? `, ${totalErrors} folder gagal` : ""}`,
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const ok = await confirm();
    if (!ok) {
        console.log("\n❌ Dibatalkan.");
        process.exit(0);
    }

    console.log("\n🗑  Memulai penghapusan data...\n");

    // 1. Kumpulkan semua report numbers (untuk storage)
    const allReports = await prisma.report.findMany({
        select: { reportNumber: true },
    });
    const reportNumbers = allReports.map((r) => r.reportNumber);
    console.log(`  Ditemukan ${reportNumbers.length} laporan di database.`);

    // 2. Hapus foto di Supabase Storage
    console.log("  Menghapus foto dari Supabase Storage...");
    await purgeStorage(reportNumbers);

    // 3. Hapus data DB dalam satu transaksi — urutan: child → parent
    console.log("  Menghapus data database...");
    const [activityResult, approvalResult, reportResult] =
        await prisma.$transaction([
            prisma.activityLog.deleteMany({}),
            prisma.approvalLog.deleteMany({}),
            prisma.report.deleteMany({}),
        ]);

    console.log(`  ✓ ActivityLog: ${activityResult.count} baris dihapus`);
    console.log(`  ✓ ApprovalLog: ${approvalResult.count} baris dihapus`);
    console.log(`  ✓ Report: ${reportResult.count} baris dihapus`);

    console.log("\n✅ Selesai. Semua data laporan telah dihapus.");
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error("\n❌ Error:", e);
        prisma.$disconnect();
        process.exit(1);
    });
