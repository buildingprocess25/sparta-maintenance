import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "../lib/prisma";

type CliOptions = {
    filePath: string;
    execute: boolean;
    sheetName?: string;
    sampleLimit: number;
};

type XlsxStoreRow = {
    code: string;
    name: string;
    branchName: string;
    rowNumber: number;
};

type DbStoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type InvalidRow = {
    rowNumber: number;
    reason: string;
    rawCode: string;
    rawName: string;
    rawBranch: string;
};

type ChangedRow = {
    code: string;
    fromBranch: string;
    toBranch: string;
};

type ParseResult = {
    stores: XlsxStoreRow[];
    invalidRows: InvalidRow[];
    duplicateCodes: string[];
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

const BRANCH_HEADER_ALIASES = new Set([
    "branch",
    "branchname",
    "branch_name",
    "cabang",
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

function normalizeStoreName(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim().replace(/\s+/g, " ");
}

function normalizeBranch(value: string): string {
    return value.trim().toUpperCase();
}

function parsePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

function parseArgs(argv: string[]): CliOptions {
    let filePath = "";
    let execute = false;
    let sheetName: string | undefined;
    let sampleLimit = 30;

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

        if ((current === "--sheet" || current === "-n") && next) {
            sheetName = next;
            i++;
            continue;
        }
        if (current.startsWith("--sheet=")) {
            sheetName = current.slice("--sheet=".length);
            continue;
        }

        if ((current === "--limit" || current === "-l") && next) {
            sampleLimit = parsePositiveInt(next, 30);
            i++;
            continue;
        }
        if (current.startsWith("--limit=")) {
            sampleLimit = parsePositiveInt(
                current.slice("--limit=".length),
                30,
            );
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

    return {
        filePath,
        execute,
        sheetName,
        sampleLimit,
    };
}

function printUsage() {
    console.log("Sinkronisasi data toko dari file XLSX");
    console.log("");
    console.log(
        'Contoh dry-run : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/stores.xlsx"',
    );
    console.log(
        'Contoh execute : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/stores.xlsx" --execute',
    );
    console.log(
        'Custom sheet    : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/stores.xlsx" --sheet "Sheet1" --execute',
    );
    console.log(
        'Custom limit    : tsx scripts/fix-store-branch-from-xlsx.ts --file "backup/stores.xlsx" --limit 50',
    );
    console.log("");
    console.log("Kolom XLSX yang dipakai: kode, nama toko, branch/cabang");
    console.log("Perilaku:");
    console.log("  - Kode belum ada di DB: create toko baru");
    console.log(
        "  - Kode sudah ada di DB: update branch saja (nama toko diabaikan)",
    );
    console.log("  - Default: DRY-RUN (tanpa perubahan DB)");
    console.log("");
    console.log("Opsi:");
    console.log("  --file, -f      Path file XLSX");
    console.log(
        "  --sheet, -n     Nama sheet (default: sheet pertama)\n  --limit, -l     Jumlah maksimum data sampel yang ditampilkan (default: 30)\n  --execute       Eksekusi perubahan ke DB (tanpa ini hanya dry-run)",
    );
}

function parseStoresFromXlsx(
    absoluteFilePath: string,
    sheetName?: string,
): ParseResult {
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
    let codeColumnIndex = 0;
    let nameColumnIndex = 1;
    let branchColumnIndex = 2;
    let detectedCode = -1;
    let detectedName = -1;
    let detectedBranch = -1;

    const searchBoundary = Math.min(5, rows.length);
    for (let i = 0; i < searchBoundary; i++) {
        const row = rows[i] ?? [];
        let rowHasKnownHeader = false;

        for (let col = 0; col < row.length; col++) {
            const headerCandidate = normalizeHeader(String(row[col] ?? ""));
            if (detectedCode < 0 && CODE_HEADER_ALIASES.has(headerCandidate)) {
                detectedCode = col;
                rowHasKnownHeader = true;
            }
            if (detectedName < 0 && NAME_HEADER_ALIASES.has(headerCandidate)) {
                detectedName = col;
                rowHasKnownHeader = true;
            }
            if (
                detectedBranch < 0 &&
                BRANCH_HEADER_ALIASES.has(headerCandidate)
            ) {
                detectedBranch = col;
                rowHasKnownHeader = true;
            }
        }

        if (rowHasKnownHeader) {
            headerRowIndex = i;
            break;
        }
    }

    const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

    if (detectedCode >= 0) {
        codeColumnIndex = detectedCode;
    }
    if (detectedName >= 0) {
        nameColumnIndex = detectedName;
    }
    if (detectedBranch >= 0) {
        branchColumnIndex = detectedBranch;
    }

    const storesByCode = new Map<string, XlsxStoreRow>();
    const invalidRows: InvalidRow[] = [];
    const duplicateCodes: string[] = [];

    for (let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i] ?? [];
        const rowNumber = i + 1;

        const code = normalizeStoreCode(row[codeColumnIndex]);
        const name = normalizeStoreName(row[nameColumnIndex]);
        const branchName = normalizeBranch(
            String(row[branchColumnIndex] ?? ""),
        );

        if (!code && !name && !branchName) {
            continue;
        }

        const missingFields: string[] = [];
        if (!code) missingFields.push("kode");
        if (!name) missingFields.push("nama toko");
        if (!branchName) missingFields.push("branch");

        if (missingFields.length > 0) {
            invalidRows.push({
                rowNumber,
                reason: `Kolom wajib kosong: ${missingFields.join(", ")}`,
                rawCode: String(row[codeColumnIndex] ?? "").trim(),
                rawName: String(row[nameColumnIndex] ?? "").trim(),
                rawBranch: String(row[branchColumnIndex] ?? "").trim(),
            });
            continue;
        }

        if (storesByCode.has(code)) {
            duplicateCodes.push(code);
        }

        storesByCode.set(code, {
            code,
            name,
            branchName,
            rowNumber,
        });
    }

    return {
        stores: Array.from(storesByCode.values()),
        invalidRows,
        duplicateCodes,
    };
}

function printStoreSample(
    title: string,
    rows: XlsxStoreRow[],
    sampleLimit: number,
) {
    if (rows.length === 0) return;
    console.log(`\n${title} (maks ${sampleLimit}):`);
    rows.slice(0, sampleLimit).forEach((row) => {
        console.log(`- ${row.code} | ${row.name} | ${row.branchName}`);
    });
}

function printDbOnlySample(
    title: string,
    rows: DbStoreRow[],
    sampleLimit: number,
) {
    if (rows.length === 0) return;
    console.log(`\n${title} (maks ${sampleLimit}):`);
    rows.slice(0, sampleLimit).forEach((row) => {
        const status = row.isActive ? "AKTIF" : "NONAKTIF";
        console.log(
            `- ${row.code} | ${row.name} | ${row.branchName} | ${status}`,
        );
    });
}

function printChangedSample(rows: ChangedRow[], sampleLimit: number) {
    if (rows.length === 0) return;
    console.log(`\nPerubahan branch (maks ${sampleLimit}):`);
    rows.slice(0, sampleLimit).forEach((row) => {
        console.log(
            `- ${row.code} | Branch: ${row.fromBranch} -> ${row.toBranch}`,
        );
    });
}

function printInvalidRows(rows: InvalidRow[], sampleLimit: number) {
    if (rows.length === 0) return;
    console.log(`\nBaris XLSX tidak valid (maks ${sampleLimit}):`);
    rows.slice(0, sampleLimit).forEach((row) => {
        console.log(
            `- Row ${row.rowNumber}: ${row.reason} | kode=${row.rawCode || "(kosong)"}, nama=${row.rawName || "(kosong)"}, branch=${row.rawBranch || "(kosong)"}`,
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

    const parsedXlsx = parseStoresFromXlsx(absoluteFilePath, options.sheetName);
    const duplicateCodes = Array.from(new Set(parsedXlsx.duplicateCodes));
    const xlsxStores = parsedXlsx.stores;

    if (xlsxStores.length === 0) {
        const firstInvalid = parsedXlsx.invalidRows[0];
        if (firstInvalid) {
            throw new Error(
                `Tidak ada baris valid. Contoh error di row ${firstInvalid.rowNumber}: ${firstInvalid.reason}`,
            );
        }
        throw new Error("Tidak ada kode toko valid di file XLSX");
    }

    const storeCodes = xlsxStores.map((store) => store.code);
    const xlsxCodeSet = new Set(storeCodes);

    const existingStores = await prisma.store.findMany({
        where: { code: { in: storeCodes } },
        select: {
            code: true,
            name: true,
            branchName: true,
            isActive: true,
        },
    });
    const existingStoresByCode = new Map(
        existingStores.map((store) => [store.code, store]),
    );

    const toCreate: XlsxStoreRow[] = [];
    const changedRows: ChangedRow[] = [];
    const unchangedRows: XlsxStoreRow[] = [];

    for (const row of xlsxStores) {
        const existing = existingStoresByCode.get(row.code);
        if (!existing) {
            toCreate.push(row);
            continue;
        }

        const branchChanged =
            normalizeBranch(existing.branchName) !== row.branchName;

        if (branchChanged) {
            changedRows.push({
                code: row.code,
                fromBranch: existing.branchName,
                toBranch: row.branchName,
            });
            continue;
        }

        unchangedRows.push(row);
    }

    const allDbStores = await prisma.store.findMany({
        select: {
            code: true,
            name: true,
            branchName: true,
            isActive: true,
        },
    });
    const dbOnlyStores = allDbStores
        .filter((store) => !xlsxCodeSet.has(store.code))
        .sort(
            (a, b) =>
                a.branchName.localeCompare(b.branchName) ||
                a.code.localeCompare(b.code),
        );

    console.log("=== Ringkasan Sinkronisasi Toko XLSX -> Database ===");
    console.log(`File              : ${absoluteFilePath}`);
    console.log(`Total baris valid  : ${xlsxStores.length}`);
    console.log(`Baris invalid      : ${parsedXlsx.invalidRows.length}`);
    console.log(`Kode duplikat XLSX : ${duplicateCodes.length}`);
    console.log(`Sudah ada di DB    : ${existingStores.length}`);
    console.log(`Akan ditambahkan   : ${toCreate.length}`);
    console.log(`Akan update branch : ${changedRows.length}`);
    console.log(`Sudah sesuai branch: ${unchangedRows.length}`);
    console.log(`Ada di DB, tidak di XLSX: ${dbOnlyStores.length}`);

    if (duplicateCodes.length > 0) {
        console.log(`\nKode duplikat di XLSX (maks ${options.sampleLimit}):`);
        duplicateCodes.slice(0, options.sampleLimit).forEach((code) => {
            console.log(`- ${code}`);
        });
        console.log("Catatan: data baris terakhir akan dipakai.");
    }

    printInvalidRows(parsedXlsx.invalidRows, options.sampleLimit);
    printStoreSample(
        "Data baru yang akan ditambahkan",
        toCreate,
        options.sampleLimit,
    );
    printChangedSample(changedRows, options.sampleLimit);
    printDbOnlySample(
        "Toko di database yang tidak ada di XLSX",
        dbOnlyStores,
        options.sampleLimit,
    );

    if (!options.execute) {
        console.log("\nDRY-RUN selesai. Tidak ada perubahan ke database.");
        console.log("Gunakan flag --execute jika hasil dry-run sudah sesuai.");
        return;
    }

    let createdCount = 0;
    let branchUpdatedCount = 0;
    let failedCount = 0;
    const failedRows: string[] = [];

    for (const row of toCreate) {
        try {
            await prisma.store.create({
                data: {
                    code: row.code,
                    name: row.name,
                    branchName: row.branchName,
                    isActive: true,
                },
            });

            createdCount++;
        } catch (error) {
            failedCount++;
            const message =
                error instanceof Error ? error.message : String(error);
            failedRows.push(`CREATE ${row.code}: ${message}`);
        }
    }

    for (const row of changedRows) {
        try {
            await prisma.store.update({
                where: { code: row.code },
                data: {
                    branchName: row.toBranch,
                },
            });

            branchUpdatedCount++;
        } catch (error) {
            failedCount++;
            const message =
                error instanceof Error ? error.message : String(error);
            failedRows.push(`UPDATE ${row.code}: ${message}`);
        }
    }

    console.log("\nEksekusi selesai.");
    console.log(`Created            : ${createdCount}`);
    console.log(`Updated branch     : ${branchUpdatedCount}`);
    console.log(`Failed             : ${failedCount}`);

    if (failedRows.length > 0) {
        console.log(`\nDetail gagal (maks ${options.sampleLimit}):`);
        failedRows.slice(0, options.sampleLimit).forEach((item) => {
            console.log(`- ${item}`);
        });
    }
}

main()
    .catch((error) => {
        console.error("Script sinkronisasi toko gagal:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
