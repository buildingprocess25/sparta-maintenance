import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../lib/prisma";

export function normalizeBmsNik(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str.toUpperCase() === "VACANT" || str === "NAN") return null;

    const num = Number(str);
    if (Number.isFinite(num)) {
        return String(Math.floor(num)).padStart(8, "0");
    }

    if (/^\d+$/.test(str)) {
        return str.padStart(8, "0");
    }

    return null;
}

export async function transferBmsStoreCoverage(options: {
    fromNik?: string;
    toNik?: string;
    dryRun?: boolean;
} = {}) {
    const isDryRun = Boolean(options.dryRun);
    const rawFromNik = options.fromNik || "26056451";
    const rawToNik = options.toNik || "26093569";

    const normalizedFromNik = normalizeBmsNik(rawFromNik) || rawFromNik;
    const normalizedToNik = normalizeBmsNik(rawToNik) || rawToNik;

    console.log(`\n================================================================`);
    console.log(`  SCRIPT PEMINDAHAN COVERAGE TOKO BMS ${isDryRun ? "[MODE SIMULASI / DRY-RUN]" : "[MODE EKSEKUSI REALS]"}`);
    console.log(`================================================================\n`);

    // 1. Cari User Asal (Old BMS) dan User Tujuan (New BMS)
    console.log("🔍 Memeriksa data BMS di database...");

    const [fromUser, toUser] = await Promise.all([
        prisma.user.findFirst({
            where: {
                OR: [
                    { NIK: rawFromNik },
                    { NIK: normalizedFromNik },
                    { name: { contains: "khasan", mode: "insensitive" } },
                ],
            },
            select: { NIK: true, name: true, role: true, branchNames: true },
        }),
        prisma.user.findFirst({
            where: {
                OR: [
                    { NIK: rawToNik },
                    { NIK: normalizedToNik },
                    { name: { contains: "Nurul Muttaqin", mode: "insensitive" } },
                ],
            },
            select: { NIK: true, name: true, role: true, branchNames: true },
        }),
    ]);

    if (!fromUser) {
        throw new Error(
            `❌ User BMS Asal dengan NIK '${rawFromNik}' (muh.khasan muafa) tidak ditemukan di database.`,
        );
    }

    if (!toUser) {
        throw new Error(
            `❌ User BMS Tujuan dengan NIK '${rawToNik}' (Mukhamad Nurul Muttaqin) tidak ditemukan di database.`,
        );
    }

    console.log(`📌 BMS ASAL (Lama)   : [${fromUser.NIK}] ${fromUser.name} (Cabang: ${fromUser.branchNames.join(", ") || "-"})`);
    console.log(`📌 BMS TUJUAN (Baru) : [${toUser.NIK}] ${toUser.name} (Cabang: ${toUser.branchNames.join(", ") || "-"})`);

    if (fromUser.NIK === toUser.NIK) {
        throw new Error("❌ BMS Asal dan BMS Tujuan adalah user yang sama! Transfer dibatalkan.");
    }

    // 2. Ambil seluruh penugasan toko aktif milik BMS Asal
    console.log(`\n📋 Mengambil daftar coverage toko aktif milik ${fromUser.name}...`);
    const activeAssignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            bmsNIK: fromUser.NIK,
            isActive: true,
        },
        include: {
            store: {
                select: {
                    code: true,
                    name: true,
                    branchName: true,
                    areaName: true,
                },
            },
        },
        orderBy: { storeCode: "asc" },
    });

    console.log(`Found ${activeAssignments.length} toko aktif yang diampu oleh [${fromUser.NIK}] ${fromUser.name}.\n`);

    if (activeAssignments.length === 0) {
        console.log(`ℹ️ Tidak ada toko aktif yang perlu dipindahkan dari BMS ${fromUser.name}. Selesai.`);
        return;
    }

    // Tampilkan rincian toko
    console.log(`=== Daftar Toko yang Akan Dipindahkan (${activeAssignments.length} Toko) ===`);
    activeAssignments.forEach((assign, index) => {
        const storeName = assign.store?.name || "N/A";
        const branch = assign.store?.branchName || "-";
        const area = assign.store?.areaName || "-";
        console.log(
            ` ${String(index + 1).padStart(3, " ")}. [${assign.storeCode}] ${storeName} (Cabang: ${branch}, Area: ${area})`,
        );
    });

    if (isDryRun) {
        console.log(`\n================================================================`);
        console.log(` 🛑 SIMULASI (DRY RUN) SELESAI`);
        console.log(`----------------------------------------------------------------`);
        console.log(`• Total toko siap dipindahkan: ${activeAssignments.length} toko`);
        console.log(`• BMS Lama (${fromUser.name}): ${activeAssignments.length} penugasan akan dinonaktifkan`);
        console.log(`• BMS Baru (${toUser.name}): ${activeAssignments.length} penugasan baru akan diaktifkan`);
        console.log(`• Database 100% AMAN (Tidak ada data yang diubah).`);
        console.log(`\n👉 Untuk melakukan transfer sungguhan ke DB, jalankan tanpa flag --dry-run.`);
        console.log(`================================================================\n`);
        return;
    }

    // 3. Proses Transaksi Pemindahan di Database
    console.log(`\n⚡ Memulai proses transaksi pemindahan coverage toko di database...`);
    const now = new Date();
    let newlyCreatedCount = 0;
    let reactivatedCount = 0;
    let deactivatedCount = 0;

    await prisma.$transaction(
        async (tx) => {
            // A. Nonaktifkan penugasan aktif dari BMS lama
            const oldAssignmentIds = activeAssignments.map((a) => a.id);
            const deactivateResult = await tx.bmsStoreAssignment.updateMany({
                where: {
                    id: { in: oldAssignmentIds },
                },
                data: {
                    isActive: false,
                    unassignedAt: now,
                    notes: `Transfer coverage ke NIK ${toUser.NIK} (${toUser.name})`,
                },
            });
            deactivatedCount = deactivateResult.count;

            // B. Buat / Aktifkan penugasan baru untuk BMS Tujuan
            for (const assign of activeAssignments) {
                const storeCode = assign.storeCode;

                const existingToAssign = await tx.bmsStoreAssignment.findFirst({
                    where: {
                        bmsNIK: toUser.NIK,
                        storeCode: storeCode,
                    },
                });

                if (existingToAssign) {
                    await tx.bmsStoreAssignment.update({
                        where: { id: existingToAssign.id },
                        data: {
                            isActive: true,
                            assignedAt: now,
                            unassignedAt: null,
                            notes: `Transfer coverage dari NIK ${fromUser.NIK} (${fromUser.name})`,
                        },
                    });
                    reactivatedCount++;
                } else {
                    await tx.bmsStoreAssignment.create({
                        data: {
                            id: crypto.randomUUID(),
                            bmsNIK: toUser.NIK,
                            storeCode: storeCode,
                            isActive: true,
                            assignedAt: now,
                            notes: `Transfer coverage dari NIK ${fromUser.NIK} (${fromUser.name})`,
                        },
                    });
                    newlyCreatedCount++;
                }
            }
        },
        {
            maxWait: 15000,
            timeout: 60000,
        },
    );

    console.log(`\n================================================================`);
    console.log(` ✅ PEMINDAHAN COVERAGE TOKO BERHASIL DIPROSES!`);
    console.log(`----------------------------------------------------------------`);
    console.log(`• Penugasan dinonaktifkan (${fromUser.name}): ${deactivatedCount} toko`);
    console.log(`• Penugasan baru dibuat (${toUser.name})     : ${newlyCreatedCount} toko`);
    if (reactivatedCount > 0) {
        console.log(`• Penugasan re-aktif (${toUser.name})       : ${reactivatedCount} toko`);
    }
    console.log(`• Total coverage toko aktif ${toUser.name} sekarang: ${newlyCreatedCount + reactivatedCount} toko`);
    console.log(`================================================================\n`);
}

// Handler Eksekusi CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run") || args.includes("-d");
    const nonFlagArgs = args.filter((a) => !a.startsWith("-"));

    const fromNik = nonFlagArgs[0] || "26056451";
    const toNik = nonFlagArgs[1] || "26093569";

    transferBmsStoreCoverage({
        fromNik,
        toNik,
        dryRun: isDryRun,
    })
        .catch((err) => {
            console.error("\n❌ Gagal memindahkan coverage toko:", err);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
