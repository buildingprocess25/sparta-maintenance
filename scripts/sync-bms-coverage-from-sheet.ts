import prisma from "../lib/prisma";
import { syncBmsCoverageFromSheet } from "../lib/jobs/sync-bms-coverage";

async function main() {
    const isDryRun = process.argv.includes("--dry-run");
    console.log(`=== Starting Daily Sync BMS Coverage from Google Sheet ${isDryRun ? "[DRY RUN]" : ""} ===`);
    const start = performance.now();

    const result = await syncBmsCoverageFromSheet({ dryRun: isDryRun });
    const duration = ((performance.now() - start) / 1000).toFixed(2);

    console.log("\n==================================================");
    console.log("=== Hasil Eksekusi Daily Sync BMS Coverage ===");
    console.log("==================================================");
    console.log(`⏱ Total Waktu            : ${duration} detik`);
    console.log(`📊 Sheet Tab Diproses     : ${result.totalSheetsProcessed} sheet (${result.sheetNames.join(", ")})`);
    console.log(`📝 Total Baris Parsed     : ${result.totalRowsParsed} baris`);
    console.log(`✅ Penugasan Baru/Update  : ${result.created} toko`);
    console.log(`🔄 Penugasan Dinonaktifkan: ${result.deactivated} toko`);
    console.log(`⏸ Penugasan Unchanged    : ${result.unchanged} toko`);
    console.log(`🧠 Diselamatkan by Nama   : ${result.resolvedByName} toko (Exact Name Match)`);
    console.log(`🧠 Diselamatkan by Fuzzy  : ${result.resolvedByFuzzy} toko (Partial Name Match)`);
    console.log(`⚠️ Skipped (Toko tak ada) : ${result.skippedMissingStores.length} toko`);
    
    if (result.skippedMissingStores.length > 0) {
        console.log(`   Daftar Kode Toko     : ${result.skippedMissingStores.join(", ")}`);
    }

    if (result.resolvedLogs && result.resolvedLogs.length > 0) {
        console.log(`\n📋 Audit Data Diselamatkan by Nama/Fuzzy:`);
        const sample = result.resolvedLogs.slice(0, 50); // tampilkan max 50 log
        for (const log of sample) {
            console.log(`   - Toko ${log.storeCode} | Sheet: [NIK: ${log.sheetNik || "KOSONG"}] "${log.sheetName}" ==> DB NIK: ${log.dbNik} (${log.method})`);
        }
        if (result.resolvedLogs.length > 50) {
            console.log(`   ... dan ${result.resolvedLogs.length - 50} data lainnya.`);
        }
    }

    console.log(`⚠️ Skipped Vacant/Invalid : ${result.skippedInvalidNiks} toko`);
    console.log("==================================================\n");
}

main()
    .catch((err) => {
        console.error("Sync BMS Coverage gagal:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
