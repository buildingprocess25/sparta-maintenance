import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";

type StoreCsvRow = {
    code: string;
    name: string;
    branchName: string;
};

function renderProgress(current: number, total: number) {
    const safeTotal = total > 0 ? total : 1;
    const percent = Math.min(100, (current / safeTotal) * 100);
    const barWidth = 24;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = `${"=".repeat(filled)}${"-".repeat(barWidth - filled)}`;
    process.stdout.write(
        `\rProgress [${bar}] ${percent.toFixed(1)}% (${current}/${total})`,
    );
}

function parseCsvRow(line: string): StoreCsvRow | null {
    if (!line.trim()) return null;

    const parts = line.split(";");
    if (parts.length < 3) return null;

    const code = parts[0].trim().toUpperCase();
    const name = parts[1].trim();
    const branchName = parts[2].trim();

    if (!code || !name || !branchName) return null;

    return { code, name, branchName };
}

async function main() {
    const argPath = process.argv[2];
    const csvPath = argPath
        ? path.resolve(process.cwd(), argPath)
        : path.join(process.cwd(), "backup", "DATA TOKO.csv");

    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV tidak ditemukan: ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split(/\r?\n/);

    if (lines.length <= 1) {
        throw new Error("CSV kosong atau tidak memiliki data");
    }

    const header = lines[0].trim();
    const isSemicolonHeader = header.includes(";");
    if (!isSemicolonHeader) {
        throw new Error(
            "Format CSV tidak valid. Gunakan pemisah ';' dan header code;name;branchName",
        );
    }

    const rows = lines.slice(1);
    const nonEmptyRows = rows.filter((row) => row.trim());
    const totalRows = nonEmptyRows.length;

    console.log(`Import CSV toko dari: ${csvPath}`);
    console.log(`Total baris data: ${totalRows}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let processed = 0;

    if (totalRows > 0) {
        renderProgress(0, totalRows);
    }

    for (const line of rows) {
        const parsed = parseCsvRow(line);
        if (!line.trim()) {
            continue;
        }

        processed++;

        if (!parsed) {
            if (line.trim()) {
                console.warn(`Skip baris invalid: ${line}`);
                skipped++;
            }
            renderProgress(processed, totalRows);
            continue;
        }

        const { code, name, branchName } = parsed;

        try {
            const existing = await prisma.store.findUnique({
                where: { code },
                select: { code: true },
            });

            if (existing) {
                // Requirement: jika kode sama, update nama toko saja + aktifkan kembali.
                await prisma.store.update({
                    where: { code },
                    data: {
                        name,
                        isActive: true,
                    },
                });
                updated++;
            } else {
                await prisma.store.create({
                    data: {
                        code,
                        name,
                        branchName,
                        isActive: true,
                    },
                });
                created++;
            }
        } catch (error) {
            failed++;
            console.error(`Gagal proses kode ${code}:`, error);
        }

        renderProgress(processed, totalRows);
    }

    if (totalRows > 0) {
        process.stdout.write("\n");
    }

    console.log("\nImport selesai.");
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
}

main()
    .catch((error) => {
        console.error("Import stores gagal:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
