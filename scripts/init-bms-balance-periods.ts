/**
 * scripts/init-bms-balance-periods.ts
 *
 * Script migrasi penuh (Opsi A) untuk fitur BMS Balance.
 * Dijalankan 1 kali saat go-live untuk membuatkan BmsBalancePeriod bagi seluruh BMS
 * yang aktif dan mengaitkan laporan yang sedang berjalan ke periode baru tersebut.
 */

import prisma from "../lib/prisma";
import { getBmsInitialBalance } from "../lib/app-settings";

async function main() {
    console.log("Memulai Inisiasi BMS Balance Period (Opsi A: Migrasi Penuh)...\n");

    const initialBalanceVal = await getBmsInitialBalance();
    console.log(`Menggunakan limit saldo awal: Rp ${initialBalanceVal.toLocaleString("id-ID")}\n`);

    // Ambil semua BMS yang aktif
    const bmsUsers = await prisma.user.findMany({
        where: {
            role: "BMS",
            deletedAt: null,
        },
        select: { NIK: true, name: true },
    });

    console.log(`Ditemukan ${bmsUsers.length} user BMS aktif.`);

    let lockedCount = 0;
    let activeCount = 0;
    let linkedReportsCount = 0;
    let skippedCount = 0;

    for (const bms of bmsUsers) {
        // Cek apakah BMS sudah punya periode aktif/terkunci
        const existingPeriod = await prisma.bmsBalancePeriod.findFirst({
            where: {
                bmsNIK: bms.NIK,
                status: { in: ["ACTIVE", "LOCKED_PJUM"] },
            },
        });

        if (existingPeriod) {
            console.log(`[SKIP] BMS ${bms.NIK} (${bms.name}) sudah memiliki periode berjalan.`);
            skippedCount++;
            continue;
        }

        // Cek apakah ada PJUM yang masih PENDING_APPROVAL
        const pendingPjum = await prisma.pjumExport.findFirst({
            where: {
                bmsNIK: bms.NIK,
                status: "PENDING_APPROVAL",
            },
            orderBy: { createdAt: "desc" },
        });

        if (pendingPjum) {
            // BMS Sedang Menunggu PJUM
            await prisma.bmsBalancePeriod.create({
                data: {
                    bmsNIK: bms.NIK,
                    status: "LOCKED_PJUM",
                    initialBalance: initialBalanceVal,
                    pjumExportId: pendingPjum.id,
                },
            });
            console.log(`[LOCKED] BMS ${bms.NIK} (${bms.name}) di-lock oleh PJUM ${pendingPjum.id}`);
            lockedCount++;
        } else {
            // BMS Bebas Bekerja (ACTIVE)
            const newPeriod = await prisma.bmsBalancePeriod.create({
                data: {
                    bmsNIK: bms.NIK,
                    status: "ACTIVE",
                    initialBalance: initialBalanceVal,
                },
            });

            // Cari semua laporan yang belum selesai dan belum masuk PJUM
            const inProgressReports = await prisma.report.findMany({
                where: {
                    createdByNIK: bms.NIK,
                    status: { not: "COMPLETED" },
                    pjumExportedAt: null,
                    balancePeriodId: null, // Hanya yang belum terikat
                },
                select: { reportNumber: true },
            });

            if (inProgressReports.length > 0) {
                const reportNumbers = inProgressReports.map((r) => r.reportNumber);
                await prisma.report.updateMany({
                    where: { reportNumber: { in: reportNumbers } },
                    data: { balancePeriodId: newPeriod.id },
                });
                console.log(`[ACTIVE] BMS ${bms.NIK} (${bms.name}) dibuatkan periode ACTIVE. Melink ${inProgressReports.length} laporan berjalan.`);
                linkedReportsCount += inProgressReports.length;
            } else {
                console.log(`[ACTIVE] BMS ${bms.NIK} (${bms.name}) dibuatkan periode ACTIVE. (Tidak ada laporan berjalan)`);
            }
            
            activeCount++;
        }
    }

    console.log("\n=================================");
    console.log("RANGKUMAN MIGRASI BMS BALANCE");
    console.log("=================================");
    console.log(`Total BMS Aktif     : ${bmsUsers.length}`);
    console.log(`Periode LOCKED_PJUM : ${lockedCount}`);
    console.log(`Periode ACTIVE      : ${activeCount}`);
    console.log(`Laporan Ter-Link    : ${linkedReportsCount}`);
    console.log(`Dilewati (Skip)     : ${skippedCount}`);
    console.log("=================================\n");
}

main()
    .catch((e) => {
        console.error("Error executing script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
