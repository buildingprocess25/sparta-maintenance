import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
} as unknown as NodeJS.Module;

async function main() {
    const { generatePjumPdf } = require(
        "../lib/pdf/generate-pjum-pdf",
    ) as typeof import("../lib/pdf/generate-pjum-pdf");

    const buffer = await generatePjumPdf({
        bmsName: "ROKHMAN",
        bmsNIK: "13097743",
        bmcName: "PANJI HANDOKO",
        bmcNIK: "09070120",
        bnmName: "YUDI PURWA NUGRAHA",
        bnmNIK: "09040998",
        approvedAt: "2026-09-16T03:00:00.000Z",
        branchName: "MALANG",
        from: "2026-09-10T00:00:00.000Z",
        to: "2026-09-16T00:00:00.000Z",
        weekNumber: 2,
        exportedAt: "2026-09-16T03:00:00.000Z",
        reports: [
            {
                reportNumber: "M1H3-2609-002",
                createdAt: "2026-09-11T00:00:00.000Z",
                storeName: "BENDUNGAN SELRJO MLG",
                storeCode: "M1H3",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 361_500,
                brand: "ALFAMART",
                ownershipType: "REGULAR",
            },
            {
                reportNumber: "M920-2609-001",
                createdAt: "2026-09-16T00:00:00.000Z",
                storeName: "KH AGUS SALIM BATU",
                storeCode: "M920",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 85_000,
                brand: "ALFAMART",
                ownershipType: "FRANCHISE",
            },
            {
                reportNumber: "L001-2609-001",
                createdAt: "2026-09-16T00:00:00.000Z",
                storeName: "LAWSON MALANG",
                storeCode: "L001",
                branchName: "MALANG",
                status: "COMPLETED",
                totalRealisasi: 55_000,
                brand: "LAWSON",
                ownershipType: "REGULAR",
            },
        ],
    });

    const outputDir = path.join(process.cwd(), "scratch");
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "pjum-recap-breakdown-smoke.pdf");
    writeFileSync(outputPath, buffer);
    console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
