import "dotenv/config";
import prisma from "../lib/prisma";
import { syncStoresFromSheet } from "../lib/jobs/sync-stores";

export {
    filterNewStores,
    parseStoreSheetRows,
} from "../lib/jobs/sync-stores";

async function main() {
    const result = await syncStoresFromSheet();

    console.log(
        `Sinkronisasi selesai: ${result.rows} baris, ${result.created} toko baru, ${result.skipped} dilewati.`,
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
