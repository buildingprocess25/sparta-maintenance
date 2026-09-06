import "dotenv/config";
import prisma from "../lib/prisma";
import { syncStoreEnrichmentFromSheet } from "../lib/jobs/sync-store-enrichment";

function hasArg(name: string) {
    return process.argv.includes(name);
}

function printResult(
    result: Awaited<ReturnType<typeof syncStoreEnrichmentFromSheet>>,
) {
    console.log("Sinkronisasi enrichment toko selesai.");
    console.log(`Dry run: ${result.dryRun ? "ya" : "tidak"}`);
    console.log(`Rows sheet dibaca: ${result.sheetRowsRead}`);
    console.log(`Kode unik valid: ${result.validUniqueSheetCodes}`);
    console.log(`Toko updated: ${result.storesUpdated}`);
    console.log(`Toko unchanged: ${result.storesUnchanged}`);
    console.log(`Duplicate identik di sheet: ${result.duplicateIdenticalRows}`);
    console.log(
        `Duplicate conflict di sheet: ${result.duplicateConflictCodes.length}`,
    );
    console.log(`Ownership invalid/kosong: ${result.invalidOwnershipValues}`);
    console.log(`Koordinat invalid/kosong: ${result.invalidCoordinateValues}`);
    console.log(
        `Kode sheet tidak ada di DB: ${result.sheetCodesNotFoundInDatabase}`,
    );
    console.log(
        `Toko DB tidak ada di sheet: ${result.databaseStoresNotFoundInSheet}`,
    );

    if (result.duplicateConflictCodes.length > 0) {
        console.log(
            `Kode duplicate conflict: ${result.duplicateConflictCodes.join(", ")}`,
        );
    }
}

async function main() {
    const result = await syncStoreEnrichmentFromSheet({
        dryRun: hasArg("--dry-run"),
        clearInvalidCoordinates: hasArg("--clear-invalid-coordinates"),
    });

    printResult(result);
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error("Sinkronisasi enrichment toko gagal:", error);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}
