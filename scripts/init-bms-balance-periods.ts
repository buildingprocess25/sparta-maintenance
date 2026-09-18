/**
 * scripts/init-bms-balance-periods.ts
 *
 * Script migrasi penuh (Opsi A) untuk fitur BMS Balance.
 * Dijalankan 1 kali saat go-live untuk membuatkan BmsBalancePeriod bagi seluruh BMS
 * yang aktif dan mengaitkan laporan yang sedang berjalan ke periode baru tersebut.
 */

import prisma from "../lib/prisma";
import { getBmsInitialBalance } from "../lib/app-settings";
import {
    BMS_ACTIVE_REPORT_BLOCKER_CUTOVER,
    BMS_INITIAL_HANGING_REPORT_CUTOVER,
    isInitialHangingReportCandidate,
} from "../lib/bms-balance-cutover-policy";

const isExecute = process.argv.includes("--execute");
const isDryRun = !isExecute;

async function main() {
    console.log("Memulai Inisiasi BMS Balance Period (Opsi A: Migrasi Penuh)...\n");
    console.log(
        isDryRun
            ? "Mode: DRY RUN (tidak ada perubahan database). Tambahkan --execute untuk menjalankan migrasi.\n"
            : "Mode: EXECUTE (database akan diubah).\n",
    );

    const initialBalanceVal = await getBmsInitialBalance();
    console.log(`Menggunakan limit saldo awal: Rp ${initialBalanceVal.toLocaleString("id-ID")}\n`);
    console.log(
        `Cutoff laporan gantung awal : ${BMS_INITIAL_HANGING_REPORT_CUTOVER.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    );
    console.log(
        `Cutoff laporan aktif blocker: ${BMS_ACTIVE_REPORT_BLOCKER_CUTOVER.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n`,
    );

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
    let linkedHangingReportsCount = 0;
    let linkedHangingTotal = 0;
    let skippedCount = 0;
    let pendingPjumWarningCount = 0;

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
            if (!isDryRun) {
                await prisma.bmsBalancePeriod.create({
                    data: {
                        bmsNIK: bms.NIK,
                        status: "LOCKED_PJUM",
                        initialBalance: initialBalanceVal,
                        pjumExportId: pendingPjum.id,
                    },
                });
            }
            console.log(`[LOCKED] BMS ${bms.NIK} (${bms.name}) di-lock oleh PJUM ${pendingPjum.id}`);
            console.log(
                `  [WARN] Lewati inisialisasi laporan gantung awal untuk BMS ini sampai PJUM pending diproses.`,
            );
            lockedCount++;
            pendingPjumWarningCount++;
        } else {
            // BMS Bebas Bekerja (ACTIVE)
            const newPeriod = isDryRun
                ? { id: `dry-run-period-${bms.NIK}` }
                : await prisma.bmsBalancePeriod.create({
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
                    createdAt: { gte: BMS_ACTIVE_REPORT_BLOCKER_CUTOVER }, // Abaikan laporan sebelum cutover
                },
                select: { reportNumber: true },
            });

            const initialHangingReports = (
                await prisma.report.findMany({
                    where: {
                        createdByNIK: bms.NIK,
                        status: "COMPLETED",
                        pjumExportedAt: null,
                        pjumHangingAt: null,
                        pjumExpiredAt: null,
                        balancePeriodId: null,
                        totalReal: { gt: 0 },
                        finishedAt: {
                            gte: BMS_INITIAL_HANGING_REPORT_CUTOVER,
                        },
                    },
                    select: {
                        reportNumber: true,
                        status: true,
                        finishedAt: true,
                        pjumExportedAt: true,
                        pjumHangingAt: true,
                        pjumExpiredAt: true,
                        totalReal: true,
                    },
                })
            ).filter((report) => isInitialHangingReportCandidate(report));

            if (inProgressReports.length > 0) {
                const reportNumbers = inProgressReports.map((r) => r.reportNumber);
                if (!isDryRun) {
                    await prisma.report.updateMany({
                        where: { reportNumber: { in: reportNumbers } },
                        data: { balancePeriodId: newPeriod.id },
                    });
                }
                console.log(`[ACTIVE] BMS ${bms.NIK} (${bms.name}) dibuatkan periode ACTIVE. Melink ${inProgressReports.length} laporan berjalan.`);
                linkedReportsCount += inProgressReports.length;
            } else {
                console.log(`[ACTIVE] BMS ${bms.NIK} (${bms.name}) dibuatkan periode ACTIVE. (Tidak ada laporan berjalan)`);
            }

            if (initialHangingReports.length > 0) {
                const reportNumbers = initialHangingReports.map(
                    (report) => report.reportNumber,
                );
                const hangingAt = new Date();
                const hangingTotal = initialHangingReports.reduce(
                    (sum, report) => sum + Number(report.totalReal ?? 0),
                    0,
                );

                if (!isDryRun) {
                    await prisma.report.updateMany({
                        where: { reportNumber: { in: reportNumbers } },
                        data: {
                            balancePeriodId: newPeriod.id,
                            pjumHangingAt: hangingAt,
                        },
                    });
                }

                console.log(
                    `  [GANTUNG] Melink ${initialHangingReports.length} laporan gantung awal senilai Rp ${hangingTotal.toLocaleString("id-ID")}.`,
                );
                linkedHangingReportsCount += initialHangingReports.length;
                linkedHangingTotal += hangingTotal;
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
    console.log(`Laporan Gantung Awal: ${linkedHangingReportsCount}`);
    console.log(`Nominal Gantung Awal: Rp ${linkedHangingTotal.toLocaleString("id-ID")}`);
    console.log(`Dilewati (Skip)     : ${skippedCount}`);
    console.log(`Warning PJUM Pending: ${pendingPjumWarningCount}`);
    console.log("=================================\n");

    if (pendingPjumWarningCount > 0) {
        console.log(
            "PERHATIAN: Ada BMS dengan PJUM pending. Untuk kebijakan laporan gantung awal, idealnya proses PJUM pending dulu lalu jalankan ulang dry-run/execute.",
        );
    }
}

main()
    .catch((e) => {
        console.error("Error executing script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
