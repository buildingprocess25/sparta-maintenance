import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import * as xlsx from "xlsx";
import prisma from "../lib/prisma";

export async function assignSingleBmsStores(options: {
    excelPath?: string;
    targetDbNik?: string;
    excelNameKeyword?: string;
    dryRun?: boolean;
} = {}) {
    const isDryRun = Boolean(options.dryRun);
    const targetDbNik = options.targetDbNik || "26074640";
    const excelNameKeyword = options.excelNameKeyword || "VIAN FUJI GINANJAR";
    const excelPath =
        options.excelPath ||
        "C:\\Users\\Rendi Elang\\Downloads\\TOKO BMS AGUSTUS 2026.xlsx";

    console.log(`\n=== Script Penugasan Toko BMS Spesifik ${isDryRun ? "[MODE DRY RUN]" : "[MODE EKSEKUSI]"} ===`);
    console.log(`Target NIK DB: ${targetDbNik}`);
    console.log(`Keyword Excel: "${excelNameKeyword}"`);
    console.log(`File Excel: ${excelPath}`);

    if (!fs.existsSync(excelPath)) {
        throw new Error(`File Excel tidak ditemukan: ${excelPath}`);
    }

    // 1. Verifikasi User Target di DB
    const user = await prisma.user.findUnique({
        where: { NIK: targetDbNik },
        select: { NIK: true, name: true, role: true, branchNames: true },
    });

    if (!user) {
        throw new Error(`User dengan NIK ${targetDbNik} tidak ditemukan di database!`);
    }

    console.log(`\nUser ditemukan di DB:`);
    console.log(`- Nama: ${user.name}`);
    console.log(`- NIK: ${user.NIK}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Cabang: ${user.branchNames.join(", ")}`);

    // 2. Baca Excel dan Ekstrak Toko
    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames.includes("GABUNG CABANG")
        ? "GABUNG CABANG"
        : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any>(ws, { header: 1, defval: null });

    const matchedStoreCodes: string[] = [];
    let excelBmsNikSample = "";
    let excelBmsNameSample = "";

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const bmsNikRaw = String(r[5] || "").trim();
        const bmsNameRaw = String(r[6] || "").trim().toUpperCase();

        // Match berdasarkan keyword nama di excel atau NIK di excel jika match
        if (
            bmsNameRaw.includes(excelNameKeyword.toUpperCase()) ||
            bmsNameRaw.includes("VIAN PUJI GINANJAR") ||
            bmsNikRaw === "26074120"
        ) {
            const storeCode = String(r[2] || "").trim();
            if (storeCode && !matchedStoreCodes.includes(storeCode)) {
                matchedStoreCodes.push(storeCode);
            }
            if (!excelBmsNikSample && bmsNikRaw) excelBmsNikSample = bmsNikRaw;
            if (!excelBmsNameSample && bmsNameRaw) excelBmsNameSample = bmsNameRaw;
        }
    }

    console.log(`\nHasil Scanning Excel:`);
    console.log(`- Sampel Data di Excel: NIK [${excelBmsNikSample}] - Nama [${excelBmsNameSample}]`);
    console.log(`- Total toko unik ditemukan di Excel: ${matchedStoreCodes.length}`);

    if (matchedStoreCodes.length === 0) {
        console.log("Tidak ada toko yang cocok di file Excel.");
        return;
    }

    // 3. Validasi Keberadaan Toko di DB
    const existingStores = await prisma.store.findMany({
        where: { code: { in: matchedStoreCodes } },
        select: { code: true, name: true, branchName: true },
    });

    const existingStoreMap = new Map(existingStores.map((s) => [s.code, s]));
    const validCodes = matchedStoreCodes.filter((code) => existingStoreMap.has(code));
    const missingCodes = matchedStoreCodes.filter((code) => !existingStoreMap.has(code));

    console.log(`\nValidasi Database:`);
    console.log(`- Toko terdaftar di DB: ${validCodes.length} / ${matchedStoreCodes.length}`);
    if (missingCodes.length > 0) {
        console.log(`- Toko TIDAK terdaftar di DB (${missingCodes.length}):`, missingCodes);
    }

    if (isDryRun) {
        console.log(`\n[DRY RUN SELESAI] Sebanyak ${validCodes.length} toko siap di-assign ke NIK ${user.NIK} (${user.name}).`);
        console.log("Jalankan tanpa flag --dry-run untuk menyimpan ke database.");
        return;
    }

    // 4. Eksekusi Upsert Penugasan Toko ke DB
    console.log(`\nMenyimpan ${validCodes.length} penugasan toko ke database untuk ${user.name} (${user.NIK})...`);

    const now = new Date();
    let insertedCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(
        async (tx) => {
            for (const storeCode of validCodes) {
                const existing = await tx.bmsStoreAssignment.findFirst({
                    where: {
                        storeCode,
                        bmsNIK: user.NIK,
                    },
                });

                if (existing) {
                    await tx.bmsStoreAssignment.update({
                        where: { id: existing.id },
                        data: {
                            isActive: true,
                            assignedAt: now,
                        },
                    });
                    updatedCount++;
                } else {
                    await tx.bmsStoreAssignment.create({
                        data: {
                            id: crypto.randomUUID(),
                            storeCode,
                            bmsNIK: user.NIK,
                            isActive: true,
                            assignedAt: now,
                        },
                    });
                    insertedCount++;
                }
            }
        },
        {
            maxWait: 10000,
            timeout: 30000,
        },
    );

    console.log(`\n=== Berhasil Disimpan ke Database! ===`);
    console.log(`- Total penugasan baru dibuat: ${insertedCount}`);
    console.log(`- Penugasan diperbarui (diaktifkan): ${updatedCount}`);
    console.log(`- Total target coverage aktif untuk ${user.name}: ${insertedCount + updatedCount} toko`);
}

// Eksekusi CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run") || args.includes("-d");
    const nonFlagArgs = args.filter((a) => !a.startsWith("-"));

    const inputPath = nonFlagArgs[0] || "C:\\Users\\Rendi Elang\\Downloads\\TOKO BMS AGUSTUS 2026.xlsx";
    const targetNik = nonFlagArgs[1] || "26074640";

    assignSingleBmsStores({
        excelPath: inputPath,
        targetDbNik: targetNik,
        dryRun: isDryRun,
    })
        .catch((err) => {
            console.error("Gagal menjalankan penugasan:", err);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
