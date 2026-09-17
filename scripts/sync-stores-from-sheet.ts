import "dotenv/config";
import prisma from "../lib/prisma";
import { syncStoresFromSheet } from "../lib/jobs/sync-stores";

export {
    buildStoreSyncChanges,
    filterNewStores,
    parseCoordinateCell,
    parseOwnershipMarker,
    parseStoreSheetRows,
} from "../lib/jobs/sync-stores";

async function main() {
    const result = await syncStoresFromSheet();

    const fieldBreakdown = Object.entries(result.updatedFields)
        .map(([field, count]) => `${field}: ${count}`)
        .join(", ");

    console.log(
        [
            `Sinkronisasi selesai: ${result.rows} baris`,
            `${result.created} toko baru`,
            `${result.updated} toko diperbarui${result.updated > 0 && fieldBreakdown ? ` (${fieldBreakdown})` : ""}`,
            `${result.unchanged} toko sudah sesuai`,
            `${result.skipped} toko DB tidak ada di sheet dan dilewati`,
            `${result.invalidOwnershipValues} ownership invalid`,
            `${result.invalidCoordinateValues} koordinat invalid`,
        ].join(", ") + ".",
    );
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error("Sinkronisasi toko gagal:", error);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}
