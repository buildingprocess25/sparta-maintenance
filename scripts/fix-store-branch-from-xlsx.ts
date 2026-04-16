import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "../lib/prisma";

type CliOptions = {
    filePath: string;
    sourceBranch?: string;
    targetBranch: string;
    execute: boolean;
    sheetName?: string;
};

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
};

type XlsxStoreRow = {
    code: string;
    name: string;
};

type DbStoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type NameMismatchRow = {
    code: string;
    xlsxName: string;
    dbName: string;
    branchName: string;
};

const CODE_HEADER_ALIASES = new Set([
    "code",
    "kodetoko",
    "kode",
    "storecode",
    "kodestore",
]);

const NAME_HEADER_ALIASES = new Set([
    "name",
    "namatoko",
    "nama",
    "store",
    "storename",
]);

function normalizeHeader(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function normalizeStoreCode(value: unknown): string {
    if (value === null || value === undefined) return "";
    const raw = String(value).trim();
    if (!raw) return "";
    return raw.toUpperCase();
}

function normalizeBranch(value: string): string {
    return value.trim().toUpperCase();
}

function normalizeNameForCompare(value: string): string {
    return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function parseArgs(argv: string[]): CliOptions {
    let filePath = "";
    let sourceBranch: string | undefined = "CIKOKOL";
    let targetBranch = "BALARAJA";
    let execute = false;
    let sheetName: string | undefined;

    for (let i = 0; i < argv.length; i++) {
        const current = argv[i];
        const next = argv[i + 1];

        if ((current === "--file" || current === "-f") && next) {
            filePath = next;
            i++;
            continue;
        }
        if (current.startsWith("--file=")) {
            filePath = current.slice("--file=".length);
            continue;
        }

        if ((current === "--source" || current === "-s") && next) {
            sourceBranch = next;
            i++;
            continue;
        }
        if (current.startsWith("--source=")) {
            sourceBranch = current.slice("--source=".length);
            continue;
        }

        if ((current === "--target" || current === "-t") && next) {
            targetBranch = next;
            i++;
            continue;
        }
        if (current.startsWith("--target=")) {
            targetBranch = current.slice("--target=".length);
            continue;
        }

        if ((current === "--sheet" || current === "-n") && next) {
            sheetName = next;
            i++;
            continue;
        }
        if (current.startsWith("--sheet=")) {
            sheetName = current.slice("--sheet=".length);
            continue;
        }

        if (current === "--all-sources") {
            sourceBranch = undefined;
            continue;
        }

        if (current === "--execute") {
            execute = true;
            continue;
        }

        if (current === "--help" || current === "-h") {
            printUsage();
            process.exit(0);
        }
    }

    if (!filePath) {
        throw new Error("Argumen --file wajib diisi");
    }

    const normalizedSource = sourceBranch
        ? normalizeBranch(sourceBranch)
        : undefined;
    const normalizedTarget = normalizeBranch(targetBranch);

    if (normalizedSource && normalizedSource === normalizedTarget) {
        throw new Error("Source branch dan target branch tidak boleh sama");
    }

    return {
        filePath,
        sourceBranch: normalizedSource,
        targetBranch: normalizedTarget,
        execute,
        sheetName,
    };
}

function printUsage() {
    console.log("Perbaikan cabang toko dari file XLSX");
    console.log("");
    console.log(
        'Contoh dry-run : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/list-cikokol.xlsx"',
    );
    console.log(
        'Contoh execute : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/list-cikokol.xlsx" --execute',
    );
    console.log(
        'Custom branch   : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/list-cikokol.xlsx" --source BALARAJA --target CIKOKOL --execute',
    );
    console.log(
        'Semua source    : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/list-cikokol.xlsx" --all-sources --target CIKOKOL --execute',
    );
    console.log("");
    console.log("Opsi:");
    console.log("  --file, -f      Path file XLSX");
    console.log(
        "  --source, -s    Branch asal yang mau diperbaiki (default: BALARAJA)",
    );
    console.log(
        "  --target, -t    Branch tujuan (default: CIKOKOL)\n  --all-sources   Abaikan filter source dan perbaiki semua yang bukan target",
    );
    console.log(
        "  --sheet, -n     Nama sheet (default: sheet pertama)\n  --execute       Eksekusi update (tanpa ini hanya dry-run)",
    );
}

function extractStoresFromXlsx(
    absoluteFilePath: string,
    sheetName?: string,
): XlsxStoreRow[] {
    const workbook = XLSX.readFile(absoluteFilePath);

    const selectedSheetName = sheetName ?? workbook.SheetNames[0];
    if (!selectedSheetName) {
        throw new Error("File XLSX kosong (tidak ada sheet)");
    }

    const sheet = workbook.Sheets[selectedSheetName];
    if (!sheet) {
        throw new Error(`Sheet tidak ditemukan: ${selectedSheetName}`);
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });

    if (rows.length === 0) {
        throw new Error("Sheet tidak memiliki data");
    }

    let headerRowIndex = -1;
    let codeColumnIndex = -1;
    let nameColumnIndex = -1;

    const searchBoundary = Math.min(5, rows.length);
    for (let i = 0; i < searchBoundary; i++) {
        const row = rows[i] ?? [];
        for (let col = 0; col < row.length; col++) {
            const headerCandidate = normalizeHeader(String(row[col] ?? ""));
            if (
                codeColumnIndex < 0 &&
                CODE_HEADER_ALIASES.has(headerCandidate)
            ) {
                headerRowIndex = i;
                codeColumnIndex = col;
            }
            if (
                nameColumnIndex < 0 &&
                NAME_HEADER_ALIASES.has(headerCandidate)
            ) {
                nameColumnIndex = col;
            }
        }
        if (codeColumnIndex >= 0) break;
    }

    if (codeColumnIndex < 0) {
        codeColumnIndex = 0;
    }

    const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    if (nameColumnIndex < 0) {
        const firstDataRow = rows[dataStartIndex] ?? [];
        if (firstDataRow.length > 1) {
            nameColumnIndex = 1;
        }
    }

    const storesByCode = new Map<string, XlsxStoreRow>();

    for (let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i] ?? [];
        const code = normalizeStoreCode(row[codeColumnIndex]);
        if (!code) continue;

        const rawName =
            nameColumnIndex >= 0 ? String(row[nameColumnIndex] ?? "") : "";

        storesByCode.set(code, {
            code,
            name: rawName.trim(),
        });
    }

    return Array.from(storesByCode.values());
}

function printSample(title: string, rows: StoreRow[]) {
    if (rows.length === 0) return;
    console.log(`\n${title} (maks 20):`);
    rows.slice(0, 20).forEach((row) => {
        console.log(`- ${row.code} | ${row.name} | ${row.branchName}`);
    });
}

function printDbOnlySample(title: string, rows: DbStoreRow[]) {
    if (rows.length === 0) return;
    console.log(`\n${title} (maks 30):`);
    rows.slice(0, 30).forEach((row) => {
        const status = row.isActive ? "AKTIF" : "NONAKTIF";
        console.log(
            `- ${row.code} | ${row.name} | ${row.branchName} | ${status}`,
        );
    });
}

function printNameMismatchSample(rows: NameMismatchRow[]) {
    if (rows.length === 0) return;
    console.log("\nNama toko beda antara XLSX vs DB (maks 30):");
    rows.slice(0, 30).forEach((row) => {
        console.log(
            `- ${row.code} | XLSX: ${row.xlsxName || "(kosong)"} | DB: ${row.dbName} | ${row.branchName}`,
        );
    });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const absoluteFilePath = path.isAbsolute(options.filePath)
        ? options.filePath
        : path.resolve(process.cwd(), options.filePath);

    if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`File XLSX tidak ditemukan: ${absoluteFilePath}`);
    }

    const xlsxStores = extractStoresFromXlsx(
        absoluteFilePath,
        options.sheetName,
    );

    if (xlsxStores.length === 0) {
        throw new Error("Tidak ada kode toko valid di file XLSX");
    }

    const storeCodes = xlsxStores.map((store) => store.code);
    const xlsxStoresByCode = new Map(
        xlsxStores.map((store) => [store.code, store]),
    );
    const xlsxCodeSet = new Set(storeCodes);

    const stores = await prisma.store.findMany({
        where: { code: { in: storeCodes } },
        select: {
            code: true,
            name: true,
            branchName: true,
        },
    });

    const storesByCode = new Map(stores.map((store) => [store.code, store]));
    const notFoundCodes = storeCodes.filter((code) => !storesByCode.has(code));

    const targetBranchStores = await prisma.store.findMany({
        where: { branchName: options.targetBranch },
        select: {
            code: true,
            name: true,
            branchName: true,
            isActive: true,
        },
    });
    const targetNotInXlsx = targetBranchStores.filter(
        (store) => !xlsxCodeSet.has(store.code),
    );

    let sourceNotInXlsx: DbStoreRow[] = [];
    if (options.sourceBranch) {
        const sourceBranchStores = await prisma.store.findMany({
            where: { branchName: options.sourceBranch },
            select: {
                code: true,
                name: true,
                branchName: true,
                isActive: true,
            },
        });
        sourceNotInXlsx = sourceBranchStores.filter(
            (store) => !xlsxCodeSet.has(store.code),
        );
    }

    const nameMismatches: NameMismatchRow[] = [];
    for (const store of stores) {
        const xlsxStore = xlsxStoresByCode.get(store.code);
        if (!xlsxStore?.name) {
            continue;
        }

        const isSameName =
            normalizeNameForCompare(xlsxStore.name) ===
            normalizeNameForCompare(store.name);

        if (!isSameName) {
            nameMismatches.push({
                code: store.code,
                xlsxName: xlsxStore.name,
                dbName: store.name,
                branchName: store.branchName,
            });
        }
    }

    const alreadyTarget: StoreRow[] = [];
    const readyToFix: StoreRow[] = [];
    const outOfSourceScope: StoreRow[] = [];

    for (const store of stores) {
        const currentBranch = normalizeBranch(store.branchName);

        if (currentBranch === options.targetBranch) {
            alreadyTarget.push(store);
            continue;
        }

        if (options.sourceBranch && currentBranch !== options.sourceBranch) {
            outOfSourceScope.push(store);
            continue;
        }

        readyToFix.push(store);
    }

    console.log("=== Ringkasan Kandidat Perbaikan Cabang Toko ===");
    console.log(`File              : ${absoluteFilePath}`);
    console.log(`Total kode file   : ${storeCodes.length}`);
    console.log(`Ditemukan di DB   : ${stores.length}`);
    console.log(`Tidak ditemukan   : ${notFoundCodes.length}`);
    console.log(
        `Tidak ada di XLSX (${options.targetBranch}): ${targetNotInXlsx.length}`,
    );
    if (options.sourceBranch) {
        console.log(
            `Tidak ada di XLSX (${options.sourceBranch}): ${sourceNotInXlsx.length}`,
        );
    }
    console.log(`Nama beda (XLSX/DB): ${nameMismatches.length}`);
    console.log(`Sudah target      : ${alreadyTarget.length}`);
    console.log(`Siap diperbaiki   : ${readyToFix.length}`);
    if (options.sourceBranch) {
        console.log(
            `Di luar source ${options.sourceBranch}: ${outOfSourceScope.length}`,
        );
    }
    console.log(`Target branch     : ${options.targetBranch}`);
    console.log(
        `Source branch     : ${options.sourceBranch ?? "SEMUA (all-sources)"}`,
    );

    printSample("Contoh data siap diperbaiki", readyToFix);

    if (notFoundCodes.length > 0) {
        console.log("\nKode toko tidak ditemukan (maks 30):");
        notFoundCodes.slice(0, 30).forEach((code) => {
            console.log(`- ${code}`);
        });
    }

    printDbOnlySample(
        `Toko di branch ${options.targetBranch} tapi tidak ada di XLSX`,
        targetNotInXlsx,
    );
    if (options.sourceBranch) {
        printDbOnlySample(
            `Toko di branch ${options.sourceBranch} tapi tidak ada di XLSX`,
            sourceNotInXlsx,
        );
    }
    printNameMismatchSample(nameMismatches);

    if (!options.execute) {
        console.log("\nDRY-RUN selesai. Tidak ada perubahan ke database.");
        console.log("Gunakan flag --execute jika hasil dry-run sudah sesuai.");
        return;
    }

    if (readyToFix.length === 0) {
        console.log("\nTidak ada data yang perlu diperbaiki.");
        return;
    }

    const whereClause = options.sourceBranch
        ? {
              code: { in: readyToFix.map((store) => store.code) },
              branchName: options.sourceBranch,
          }
        : {
              code: { in: readyToFix.map((store) => store.code) },
          };

    const updateResult = await prisma.store.updateMany({
        where: whereClause,
        data: {
            branchName: options.targetBranch,
        },
    });

    console.log("\nEksekusi selesai.");
    console.log(`Total update sukses: ${updateResult.count}`);

    if (updateResult.count !== readyToFix.length) {
        console.log(
            "Catatan: jumlah update lebih kecil dari kandidat. Kemungkinan ada perubahan data bersamaan.",
        );
    }
}

main()
    .catch((error) => {
        console.error("Script perbaikan cabang toko gagal:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
