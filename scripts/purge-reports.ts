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

type StorageListItem = {
    id: string | null;
    name: string;
};

const LIST_LIMIT = 100;
const DELETE_BATCH_SIZE = 100;

async function listAllStorageObjects(
    bucket: ReturnType<ReturnType<typeof getSupabaseClient>["storage"]["from"]>,
    prefix = "",
): Promise<string[]> {
    let offset = 0;
    const objectPaths: string[] = [];

    while (true) {
        const { data, error } = await bucket.list(prefix, {
            limit: LIST_LIMIT,
            offset,
        });

        if (error) {
            throw new Error(
                `Gagal membaca bucket di "${prefix || "/"}": ${error.message}`,
            );
        }

        const rows = (data ?? []) as StorageListItem[];
        if (rows.length === 0) break;

        for (const row of rows) {
            const fullPath = prefix ? `${prefix}/${row.name}` : row.name;

            // Folder pseudo-entry has id = null.
            if (!row.id) {
                const childPaths = await listAllStorageObjects(bucket, fullPath);
                objectPaths.push(...childPaths);
            } else {
                objectPaths.push(fullPath);
            }
        }

        if (rows.length < LIST_LIMIT) break;
        offset += LIST_LIMIT;
    }

    return objectPaths;
}

async function purgeStorage(): Promise<void> {
    const supabase = getSupabaseClient();
    const bucket = supabase.storage.from("reports");

    let totalDeleted = 0;
    let totalErrors = 0;

    const objectPaths = await listAllStorageObjects(bucket);

    if (objectPaths.length === 0) {
        console.log("  ✓ Storage: tidak ada file yang perlu dihapus");
        return;
    }

    for (let i = 0; i < objectPaths.length; i += DELETE_BATCH_SIZE) {
        const chunk = objectPaths.slice(i, i + DELETE_BATCH_SIZE);
        const { error } = await bucket.remove(chunk);

        if (error) {
            console.warn(`  ⚠ Gagal hapus batch storage: ${error.message}`);
            totalErrors++;
            continue;
        }

        totalDeleted += chunk.length;
    }

    console.log(
        `  ✓ Storage: ${totalDeleted} file dihapus${totalErrors > 0 ? `, ${totalErrors} batch gagal` : ""}`,
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

    // 1. Kumpulkan semua report numbers (untuk log)
    const allReports = await prisma.report.findMany({
        select: { reportNumber: true },
    });
    const reportNumbers = allReports.map((r) => r.reportNumber);
    console.log(`  Ditemukan ${reportNumbers.length} laporan di database.`);

    // 2. Hapus foto di Supabase Storage
    console.log("  Menghapus foto dari Supabase Storage...");
    await purgeStorage();

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
