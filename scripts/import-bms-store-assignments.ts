import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import * as xlsx from "xlsx";
import prisma from "../lib/prisma";

export function normalizeBmsNik(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str.toUpperCase() === "VACANT" || str === "NaN") return null;

    const num = Number(str);
    if (Number.isFinite(num)) {
        return String(Math.floor(num)).padStart(8, "0");
    }

    if (/^\d+$/.test(str)) {
        return str.padStart(8, "0");
    }

    return null;
}

export function normalizeBmsName(name: unknown): string {
    if (!name) return "";
    return String(name)
        .trim()
        .toUpperCase()
        .replace(/[.,]/g, "")
        .replace(/\s+/g, " ");
}

export function isValidAssignmentRow(storeCode: unknown, bmsNik: unknown): boolean {
    const code = storeCode ? String(storeCode).trim() : "";
    const nik = bmsNik ? String(bmsNik).trim() : "";
    return code.length > 0 && nik.length > 0;
}

export async function importBmsAssignmentsFromExcel(
    excelPath: string,
    options: { dryRun?: boolean } = {},
) {
    const isDryRun = Boolean(options.dryRun);

    if (!fs.existsSync(excelPath)) {
        throw new Error(`File Excel tidak ditemukan: ${excelPath}`);
    }

    console.log(`\n=== Memulai Import Penugasan Toko BMS ${isDryRun ? "[MODE DRY RUN]" : ""} ===`);
    console.log(`File: ${excelPath}`);
    if (isDryRun) {
        console.log(`Perhatian: Mode Dry Run aktif. TIDAK ADA perubahan yang akan disimpan ke database.`);
    }

    const wb = xlsx.readFile(excelPath);
    const sheetName = wb.SheetNames.includes("GABUNG CABANG")
        ? "GABUNG CABANG"
        : wb.SheetNames[0];

    const ws = wb.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Header berada di baris ke-3 (index 2), data mulai baris ke-4 (index 3)
    const rows = rawData.slice(3).filter((r) => r && r.length > 0);
    console.log(`Total baris terbaca di sheet '${sheetName}': ${rows.length}`);

    // Muat data referensi User (BMS) dan Store dari database
    console.log("Memuat data master User (BMS) dan Store dari database...");
    const [bmsUsers, stores] = await Promise.all([
        prisma.user.findMany({
            where: { role: "BMS" },
            select: { NIK: true, name: true, branchNames: true },
        }),
        prisma.store.findMany({
            select: { code: true, name: true, branchName: true },
        }),
    ]);

    const validBmsMap = new Map(bmsUsers.map((u) => [u.NIK.trim(), u]));
    const validBmsByNameMap = new Map<string, (typeof bmsUsers)[number]>();
    for (const u of bmsUsers) {
        const clean = normalizeBmsName(u.name);
        if (clean) {
            validBmsByNameMap.set(clean, u);
        }
    }
    const validStoreMap = new Map(stores.map((s) => [s.code.trim().toUpperCase(), s]));

    console.log(`BMS terdaftar di DB: ${validBmsMap.size}`);
    console.log(`Toko terdaftar di DB: ${validStoreMap.size}`);

    const assignmentsToUpsert: Array<{
        storeCode: string;
        bmsNIK: string;
        notes: string;
    }> = [];

    const skippedList: Array<{
        storeCode: string;
        storeName: string;
        cabang: string;
        rawNik: any;
        namaBms: any;
        reason: string;
    }> = [];

    const resolvedByNameMap = new Map<string, { excelNik: string; dbNik: string; dbName: string }>();

    for (const r of rows) {
        const cabang = r[1] ? String(r[1]).trim() : "";
        const storeCode = r[2] ? String(r[2]).trim().toUpperCase() : "";
        const storeName = r[3] ? String(r[3]).trim() : "";
        const rawNik = r[5];
        const namaBms = r[6] ? String(r[6]).trim() : "";

        const normalizedNik = normalizeBmsNik(rawNik);

        if (!storeCode) {
            skippedList.push({
                storeCode: "(KOSONG)",
                storeName,
                cabang,
                rawNik,
                namaBms,
                reason: "Kode toko kosong",
            });
            continue;
        }

        if (!validStoreMap.has(storeCode)) {
            skippedList.push({
                storeCode,
                storeName,
                cabang,
                rawNik,
                namaBms,
                reason: "Toko belum terdaftar di tabel Store database",
            });
            continue;
        }

        if (!normalizedNik) {
            skippedList.push({
                storeCode,
                storeName,
                cabang,
                rawNik,
                namaBms,
                reason: "NIK BMS kosong / bernilai VACANT",
            });
            continue;
        }

        let targetBms = validBmsMap.get(normalizedNik);
        let matchedByName = false;

        // Fallback: jika NIK tidak match, coba cari by Nama BMS
        if (!targetBms && namaBms) {
            const cleanExcelName = normalizeBmsName(namaBms);
            targetBms = validBmsByNameMap.get(cleanExcelName);

            if (!targetBms) {
                for (const u of bmsUsers) {
                    const cleanDbName = normalizeBmsName(u.name);
                    if (
                        cleanDbName === cleanExcelName ||
                        cleanDbName.includes(cleanExcelName) ||
                        cleanExcelName.includes(cleanDbName)
                    ) {
                        targetBms = u;
                        break;
                    }
                }
            }

            if (targetBms) {
                matchedByName = true;
            }
        }

        if (!targetBms) {
            skippedList.push({
                storeCode,
                storeName,
                cabang,
                rawNik,
                namaBms,
                reason: `BMS NIK '${normalizedNik}' (${namaBms}) tidak ditemukan di DB baik by NIK maupun by Nama`,
            });
            continue;
        }

        if (matchedByName && !resolvedByNameMap.has(namaBms)) {
            resolvedByNameMap.set(namaBms, {
                excelNik: normalizedNik,
                dbNik: targetBms.NIK,
                dbName: targetBms.name,
            });
        }

        assignmentsToUpsert.push({
            storeCode,
            bmsNIK: targetBms.NIK, // Menggunakan NIK asli di database (tanpa mengubah tabel User)
            notes: `Import master coverage dari Excel (${cabang})`,
        });
    }

    if (resolvedByNameMap.size > 0) {
        console.log(`\n=== Pencocokan Otomatis via Nama (Fallback By Name) ===`);
        for (const [nama, info] of resolvedByNameMap) {
            console.log(
                `  ✓ '${nama}' (Excel NIK: ${info.excelNik} -> Menggunakan DB NIK: ${info.dbNik} [${info.dbName}])`,
            );
        }
        console.log(`Total BMS berhasil dicocokkan via nama: ${resolvedByNameMap.size} user.`);
    }

    console.log(`\nValidasi selesai:`);
    console.log(`- Siap di-assign: ${assignmentsToUpsert.length}`);
    console.log(`- Dilewati (Skipped): ${skippedList.length}`);

    // Tulis daftar skipped ke folder logs
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, "skipped-bms-assignments.json");
    fs.writeFileSync(logPath, JSON.stringify(skippedList, null, 2), "utf8");
    console.log(`Detail skipped data disimpan di: ${logPath}`);

    if (isDryRun) {
        console.log("\n=== [DRY RUN SELESAI] ===");
        console.log(`Simulasi berhasil! Sebanyak ${assignmentsToUpsert.length} penugasan toko valid.`);
        console.log(`Database 100% aman (tidak ada query INSERT/UPDATE yang dijalankan).`);
        return;
    }

    // Proses batch upsert ke tabel BmsStoreAssignment
    console.log("\nMenyimpan penugasan ke database (chunk 500 bulk operations)...");
    const chunkSize = 500;
    let savedCount = 0;

    for (let i = 0; i < assignmentsToUpsert.length; i += chunkSize) {
        const chunk = assignmentsToUpsert.slice(i, i + chunkSize);
        const storeCodes = chunk.map((c) => c.storeCode);

        await prisma.$transaction(
            async (tx) => {
                // 1. Ambil data penugasan aktif eksisting untuk seluruh toko di chunk ini (1 query)
                const existingActive = await tx.bmsStoreAssignment.findMany({
                    where: {
                        storeCode: { in: storeCodes },
                        isActive: true,
                    },
                    select: {
                        id: true,
                        storeCode: true,
                        bmsNIK: true,
                    },
                });

                const existingByStoreCode = new Map(
                    existingActive.map((e) => [e.storeCode, e]),
                );

                const idsToDeactivate: string[] = [];
                const toCreateItems: Array<{
                    id: string;
                    storeCode: string;
                    bmsNIK: string;
                    isActive: boolean;
                    notes: string;
                }> = [];

                for (const item of chunk) {
                    const current = existingByStoreCode.get(item.storeCode);
                    if (current) {
                        if (current.bmsNIK !== item.bmsNIK) {
                            idsToDeactivate.push(current.id);
                            toCreateItems.push({
                                id: crypto.randomUUID(),
                                storeCode: item.storeCode,
                                bmsNIK: item.bmsNIK,
                                isActive: true,
                                notes: item.notes,
                            });
                        }
                        // Jika sudah ada dan bmsNIK sama persis, lewati
                    } else {
                        toCreateItems.push({
                            id: crypto.randomUUID(),
                            storeCode: item.storeCode,
                            bmsNIK: item.bmsNIK,
                            isActive: true,
                            notes: item.notes,
                        });
                    }
                }

                // 2. Bulk nonaktifkan penugasan lama jika ada mutasi BMS (1 query)
                if (idsToDeactivate.length > 0) {
                    await tx.bmsStoreAssignment.updateMany({
                        where: { id: { in: idsToDeactivate } },
                        data: {
                            isActive: false,
                            unassignedAt: new Date(),
                            notes: "Digantikan oleh import massal baru",
                        },
                    });
                }

                // 3. Bulk insert penugasan baru (1 query)
                if (toCreateItems.length > 0) {
                    await tx.bmsStoreAssignment.createMany({
                        data: toCreateItems,
                        skipDuplicates: true,
                    });
                }
            },
            {
                maxWait: 15000,
                timeout: 60000,
            },
        );

        savedCount += chunk.length;
        process.stdout.write(
            `\rProgress: ${savedCount} / ${assignmentsToUpsert.length} (${Math.round((savedCount / assignmentsToUpsert.length) * 100)}%)`,
        );
    }

    console.log("\n\n=== Import Selesai Berhasil! ===");
    console.log(`Total penugasan aktif berhasil dipetakan: ${savedCount}`);
}

// Handler eksekusi CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run") || args.includes("-d");
    const nonFlagArgs = args.filter((a) => !a.startsWith("-"));

    const inputPath =
        nonFlagArgs[0] ||
        "C:\\Users\\Rendi Elang\\Downloads\\TOKO BMS AGUSTUS 2026.xlsx";

    importBmsAssignmentsFromExcel(inputPath, { dryRun: isDryRun })
        .catch((err) => {
            console.error("Gagal menjalankan import:", err);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
