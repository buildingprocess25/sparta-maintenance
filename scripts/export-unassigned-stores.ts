import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";
import prisma from "../lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "../lib/admin-branch-scope";

async function run() {
    console.log("🔍 Mencari toko aktif yang unassigned (belum ditugaskan ke BMS)...");

    const stores = await prisma.store.findMany({
        where: {
            isActive: true,
            branchName: {
                not: EXCLUDED_ADMIN_BRANCH_NAME,
            },
            storeAssignments: {
                none: {
                    isActive: true,
                },
            },
        },
        orderBy: [
            { branchName: "asc" },
            { code: "asc" },
        ],
        select: {
            code: true,
            name: true,
            branchName: true,
            areaName: true,
            brand: true,
            ownershipType: true,
            latitude: true,
            longitude: true,
        },
    });

    console.log(`\n✅ Ditemukan total ${stores.length} toko aktif unassigned.`);

    // Hitung ringkasan per cabang
    const branchSummaryMap = new Map<string, number>();
    for (const store of stores) {
        const branch = store.branchName || "TANPA CABANG";
        branchSummaryMap.set(branch, (branchSummaryMap.get(branch) || 0) + 1);
    }

    console.log("\n📊 Ringkasan Toko Unassigned per Cabang:");
    console.table(
        Array.from(branchSummaryMap.entries()).map(([branch, count], idx) => ({
            No: idx + 1,
            Cabang: branch,
            "Jumlah Toko Unassigned": count,
        }))
    );

    // Persiapkan Data Sheet 1: Detail Toko Unassigned
    const detailRows = stores.map((s, idx) => ({
        "No": idx + 1,
        "Kode Toko": s.code,
        "Nama Toko": s.name,
        "Cabang": s.branchName,
        "Area": s.areaName || "-",
        "Brand": s.brand || "-",
        "Tipe Kepemilikan": s.ownershipType,
        "Latitude": s.latitude ? Number(s.latitude) : "-",
        "Longitude": s.longitude ? Number(s.longitude) : "-",
    }));

    // Persiapkan Data Sheet 2: Ringkasan Per Cabang
    const summaryRows = Array.from(branchSummaryMap.entries()).map(([branch, count], idx) => ({
        "No": idx + 1,
        "Nama Cabang": branch,
        "Jumlah Toko Unassigned": count,
    }));

    // Buat Workbook Excel
    const workbook = xlsx.utils.book_new();

    const detailSheet = xlsx.utils.json_to_sheet(detailRows);
    detailSheet["!cols"] = [
        { wch: 6 },  // No
        { wch: 14 }, // Kode Toko
        { wch: 35 }, // Nama Toko
        { wch: 20 }, // Cabang
        { wch: 20 }, // Area
        { wch: 15 }, // Brand
        { wch: 18 }, // Tipe Kepemilikan
        { wch: 15 }, // Latitude
        { wch: 15 }, // Longitude
    ];
    xlsx.utils.book_append_sheet(workbook, detailSheet, "Detail Toko Unassigned");

    const summarySheet = xlsx.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [
        { wch: 6 },  // No
        { wch: 25 }, // Nama Cabang
        { wch: 25 }, // Jumlah Toko Unassigned
    ];
    xlsx.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Per Cabang");

    // Simpan File
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `Toko_Unassigned_SPARTA_${timestamp}.xlsx`;
    const outputPath = path.join(process.cwd(), filename);

    xlsx.writeFile(workbook, outputPath);

    console.log(`\n🎉 File Excel berhasil dibuat!`);
    console.log(`📂 Lokasi file: ${outputPath}`);
}

run()
    .catch((err) => {
        console.error("❌ Terjadi kesalahan saat menjalankan script:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
