import prisma from "../lib/prisma";

const EXECUTE = process.argv.includes("--execute");
const CLEANUP_NOTE = "Pembersihan: BMS sudah dihapus";

async function run() {
    console.log(
        EXECUTE
            ? "⚠️  MODE EXECUTE: assignment milik BMS terhapus akan dinonaktifkan."
            : "🔍 MODE DRY-RUN: tidak ada data yang diubah.",
    );

    const assignments = await prisma.bmsStoreAssignment.findMany({
        where: {
            isActive: true,
            bms: { deletedAt: { not: null } },
        },
        orderBy: [{ bmsNIK: "asc" }, { storeCode: "asc" }],
        select: {
            id: true,
            storeCode: true,
            bmsNIK: true,
            bms: {
                select: { name: true, branchNames: true, deletedAt: true },
            },
        },
    });

    if (assignments.length === 0) {
        console.log("✅ Tidak ada assignment aktif milik BMS yang sudah dihapus.");
        return;
    }

    const byBms = new Map<
        string,
        { NIK: string; Nama: string; Cabang: string; Toko: number; Dihapus: string }
    >();
    for (const a of assignments) {
        const row = byBms.get(a.bmsNIK) ?? {
            NIK: a.bmsNIK,
            Nama: a.bms.name,
            Cabang: a.bms.branchNames.join(", "),
            Toko: 0,
            Dihapus: a.bms.deletedAt?.toISOString().slice(0, 10) ?? "-",
        };
        row.Toko += 1;
        byBms.set(a.bmsNIK, row);
    }

    console.table(Array.from(byBms.values()));
    console.log(
        `Total: ${assignments.length} assignment aktif dari ${byBms.size} BMS yang sudah dihapus.`,
    );

    if (!EXECUTE) {
        console.log(
            "\nDry-run selesai. Jalankan `npm run vacate:deleted-bms:execute` untuk menonaktifkan assignment di atas.",
        );
        return;
    }

    const { count } = await prisma.bmsStoreAssignment.updateMany({
        where: { id: { in: assignments.map((a) => a.id) }, isActive: true },
        data: {
            isActive: false,
            unassignedAt: new Date(),
            unassignedByNIK: null,
            notes: CLEANUP_NOTE,
        },
    });

    console.log(`\n🎉 ${count} assignment dinonaktifkan. Toko-toko tersebut sekarang vacant.`);
}

run()
    .catch((err) => {
        console.error("❌ Terjadi kesalahan saat menjalankan script:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
