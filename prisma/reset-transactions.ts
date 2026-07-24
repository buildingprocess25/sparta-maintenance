/**
 * prisma/reset-transactions.ts
 *
 * Script untuk menghapus semua data transaksi eksperimen, TANPA menghapus
 * master data (User, Store, AppSetting).
 *
 * Data yang DIHAPUS:
 *   - ActivityLog
 *   - ApprovalLog
 *   - Notification
 *   - UserPresence
 *   - PushSubscription
 *   - GoogleDriveFolderCache
 *   - PjumExport
 *   - Report
 *   - BmsBalancePeriod
 *
 * Data yang DIPERTAHANKAN:
 *   - User (semua akun)
 *   - Store (semua toko)
 *   - AppSetting
 *
 * Cara menjalankan:
 *   npx tsx prisma/reset-transactions.ts
 */

import dotenv from "dotenv";
import prisma from "../lib/prisma";

dotenv.config();

async function main() {
    console.log("🚨 Mulai reset data transaksi...\n");

    // Urutan penting: hapus child records dulu sebelum parent
    const steps: Array<{ label: string; fn: () => Promise<{ count: number }> }> = [
        {
            label: "ActivityLog",
            fn: () => prisma.activityLog.deleteMany(),
        },
        {
            label: "ApprovalLog",
            fn: () => prisma.approvalLog.deleteMany(),
        },
        {
            label: "Notification",
            fn: () => prisma.notification.deleteMany(),
        },
        {
            label: "UserPresence",
            fn: () => prisma.userPresence.deleteMany(),
        },
        {
            label: "PushSubscription",
            fn: () => prisma.pushSubscription.deleteMany(),
        },
        {
            label: "GoogleDriveFolderCache",
            fn: () => prisma.googleDriveFolderCache.deleteMany(),
        },
        {
            label: "Report",
            fn: () => prisma.report.deleteMany(),
        },
        {
            label: "PjumExport",
            fn: () => prisma.pjumExport.deleteMany(),
        },
        {
            label: "BmsBalancePeriod",
            fn: () => prisma.bmsBalancePeriod.deleteMany(),
        },
    ];

    for (const step of steps) {
        const result = await step.fn();
        console.log(`  ✅ ${step.label}: ${result.count} baris dihapus`);
    }

    // ─── Ringkasan master data yang masih ada ───────────────────────────────
    const [userCount, storeCount] = await Promise.all([
        prisma.user.count(),
        prisma.store.count(),
    ]);

    console.log("\n─────────────────────────────────────────");
    console.log("📋 Master data yang masih tersimpan:");
    console.log(`   👤 User     : ${userCount} akun`);
    console.log(`   🏪 Store    : ${storeCount} toko`);
    console.log("─────────────────────────────────────────");
    console.log("\n✨ Reset selesai! Database bersih dan siap eksperimen dari awal.\n");
}

main()
    .catch((err) => {
        console.error("❌ Gagal reset:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
