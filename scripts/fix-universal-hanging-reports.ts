/**
 * scripts/fix-universal-hanging-reports.ts
 *
 * Script ini memperbaiki masalah data "Laporan Gantung Awal" yang di-flag secara keliru
 * oleh script inisialisasi cutover. Script membedakan laporan yang benar-benar gantung 
 * dengan laporan baru berdasarkan riwayat PJUM per BMS.
 */

import prisma from "../lib/prisma";
import * as xlsx from "xlsx";
import os from "os";
import path from "path";

const isExecute = process.argv.includes("--execute");
const isDryRun = !isExecute;

async function main() {
    console.log("Memulai perbaikan massal data Laporan Gantung...\n");
    console.log(
        isDryRun
            ? "Mode: DRY RUN (tidak ada perubahan database). Tambahkan --execute untuk menjalankan perbaikan.\n"
            : "Mode: EXECUTE (database akan diubah).\n",
    );

    // Ambil semua BMS yang mungkin punya data laporan
    const bmsUsers = await prisma.user.findMany({
        where: { role: "BMS" },
        select: { NIK: true, name: true }
    });

    console.log(`Mengevaluasi ${bmsUsers.length} user BMS...`);

    let totalFixed = 0;
    let bmsAffected = 0;
    const exportData: any[] = [];

    for (const bms of bmsUsers) {
        // Cari PJUM terakhir untuk BMS ini yang berpotensi menyisakan laporan
        const latestPjum = await prisma.pjumExport.findFirst({
            where: { 
                bmsNIK: bms.NIK, 
                status: { in: ["APPROVED", "PENDING_APPROVAL"] } 
            },
            orderBy: { toDate: "desc" }
        });

        const whereClause: any = {
            createdByNIK: bms.NIK,
            pjumHangingAt: { not: null },
            pjumExportedAt: null,
            pjumExpiredAt: null,
        };

        if (latestPjum) {
            // toEndExclusive = toDate + 1 hari (tepat jam 00:00)
            const toEndExclusive = new Date(latestPjum.toDate.getTime() + 24 * 60 * 60 * 1000);
            
            // Hanya perbaiki laporan yang diselesaikan SETELAH batas waktu PJUM terakhir
            whereClause.finishedAt = {
                gte: toEndExclusive
            };
        } else {
            // Jika BMS belum pernah membuat PJUM sama sekali, maka SEMUA 
            // laporannya adalah laporan baru (belum ada yang bisa tertinggal)
            whereClause.finishedAt = { not: null };
        }

        const mistakenReports = await prisma.report.findMany({
            where: whereClause,
            select: { 
                reportNumber: true, 
                finishedAt: true, 
                pjumHangingAt: true 
            },
            orderBy: { finishedAt: "asc" }
        });

        if (mistakenReports.length > 0) {
            bmsAffected++;
            const reportNumbers = mistakenReports.map(r => r.reportNumber);
            
            // Catat data untuk diexport ke excel
            for (const report of mistakenReports) {
                exportData.push({
                    "NIK BMS": bms.NIK,
                    "Nama BMS": bms.name,
                    "Nomor Laporan": report.reportNumber,
                    "Tanggal Selesai": report.finishedAt ? report.finishedAt.toISOString() : "-",
                    "Ter-flag Gantung Sejak": report.pjumHangingAt ? report.pjumHangingAt.toISOString() : "-",
                });
            }
            
            if (!isDryRun) {
                await prisma.report.updateMany({
                    where: { reportNumber: { in: reportNumbers } },
                    data: { pjumHangingAt: null }
                });
            }

            console.log(`[BMS ${bms.NIK} - ${bms.name}] ${isDryRun ? 'Akan m' : 'M'}emperbaiki ${mistakenReports.length} laporan.`);
            totalFixed += mistakenReports.length;
        }
    }

    console.log("\n=================================");
    console.log("RANGKUMAN PERBAIKAN DATA");
    console.log("=================================");
    console.log(`BMS Terdampak       : ${bmsAffected}`);
    console.log(`Total Laporan Fixed : ${totalFixed}`);
    console.log("=================================\n");
    
    if (exportData.length > 0 && isDryRun) {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(exportData);
        
        // Atur lebar kolom agar lebih rapi
        ws['!cols'] = [
            { wch: 15 }, // NIK BMS
            { wch: 30 }, // Nama BMS
            { wch: 20 }, // Nomor Laporan
            { wch: 30 }, // Tanggal Selesai
            { wch: 30 }  // Ter-flag Gantung Sejak
        ];
        
        xlsx.utils.book_append_sheet(wb, ws, "Laporan Diperbaiki");
        
        // Simpan ke direktori temporary OS agar tidak mengotori working git dir
        const fileName = `rekap-perbaikan-gantung-${Date.now()}.xlsx`;
        const exportPath = path.join(os.tmpdir(), fileName);
        
        xlsx.writeFile(wb, exportPath);
        
        console.log(`✅ Berhasil mengekspor hasil DRY RUN ke file Excel.`);
        console.log(`📂 Lokasi file: ${exportPath}\n`);
        console.log("File Excel ini disimpan di direktori sistem (temporary) sehingga git/repository kamu tetap bersih.");
    }

    if (isDryRun) {
        console.log("\nScript selesai dalam mode DRY RUN. Gunakan --execute untuk menerapkan perubahan ke database.");
    } else {
        console.log("\nScript selesai dalam mode EXECUTE. Perubahan telah disimpan ke database.");
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
