import prisma from "../lib/prisma";

type CliOptions = {
    keepBranches: string[];
    execute: boolean;
    detachReports: boolean;
    sampleLimit: number;
};

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
};

type ReferencedStore = {
    storeCode: string;
    reportCount: number;
};

const DEFAULT_KEEP_BRANCHES = ["BALARAJA", "CIKOKOL", "HEAD OFFICE"];

function normalizeBranchName(value: string): string {
    return value.trim().toUpperCase();
}

function parsePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

function parseBranchList(value: string): string[] {
    const branches = value
        .split(",")
        .map((branch) => normalizeBranchName(branch))
        .filter((branch) => branch.length > 0);

    return Array.from(new Set(branches));
}

function printUsage() {
    console.log("Prune data Store berdasarkan branch yang dipertahankan.");
    console.log("");
    console.log(
        "Default branch yang dipertahankan: BALARAJA dan CIKOKOL (case-insensitive).",
    );
    console.log("");
    console.log("Contoh:");
    console.log(
        "  npx tsx scripts/prune-stores-by-branch.ts                          # dry-run",
    );
    console.log(
        "  npx tsx scripts/prune-stores-by-branch.ts --execute                # eksekusi hapus",
    );
    console.log(
        "  npx tsx scripts/prune-stores-by-branch.ts --execute --detach-reports",
    );
    console.log(
        "  npx tsx scripts/prune-stores-by-branch.ts --keep BALARAJA,CIKOKOL",
    );
    console.log("");
    console.log("Opsi:");
    console.log(
        "  --keep, -k          Daftar branch dipisah koma (default: BALARAJA,CIKOKOL)",
    );
    console.log(
        "  --execute           Eksekusi perubahan ke database (tanpa ini hanya dry-run)",
    );
    console.log(
        "  --detach-reports    Set report.storeCode = null sebelum hapus store (jika ada relasi)",
    );
    console.log(
        "  --limit, -l         Jumlah sampel data yang ditampilkan (default: 20)",
    );
}

function parseArgs(argv: string[]): CliOptions {
    let keepBranches = [...DEFAULT_KEEP_BRANCHES];
    let execute = false;
    let detachReports = false;
    let sampleLimit = 20;

    for (let i = 0; i < argv.length; i++) {
        const current = argv[i];
        const next = argv[i + 1];

        if ((current === "--keep" || current === "-k") && next) {
            keepBranches = parseBranchList(next);
            i++;
            continue;
        }
        if (current.startsWith("--keep=")) {
            keepBranches = parseBranchList(current.slice("--keep=".length));
            continue;
        }

        if ((current === "--limit" || current === "-l") && next) {
            sampleLimit = parsePositiveInt(next, 20);
            i++;
            continue;
        }
        if (current.startsWith("--limit=")) {
            sampleLimit = parsePositiveInt(
                current.slice("--limit=".length),
                20,
            );
            continue;
        }

        if (current === "--execute") {
            execute = true;
            continue;
        }

        if (current === "--detach-reports") {
            detachReports = true;
            continue;
        }

        if (current === "--help" || current === "-h") {
            printUsage();
            process.exit(0);
        }
    }

    if (keepBranches.length === 0) {
        throw new Error(
            "Daftar branch yang dipertahankan kosong. Isi lewat --keep BALARAJA,CIKOKOL",
        );
    }

    return {
        keepBranches,
        execute,
        detachReports,
        sampleLimit,
    };
}

function printStoreSample(
    storesToDelete: StoreRow[],
    referencedByCode: Map<string, number>,
    sampleLimit: number,
) {
    if (storesToDelete.length === 0) {
        return;
    }

    console.log(`\nSampel store yang akan dihapus (maks ${sampleLimit}):`);
    storesToDelete.slice(0, sampleLimit).forEach((store) => {
        const reportCount = referencedByCode.get(store.code) ?? 0;
        const relationInfo =
            reportCount > 0 ? ` | dipakai ${reportCount} report` : "";
        console.log(
            `- ${store.code} | ${store.name} | ${store.branchName}${relationInfo}`,
        );
    });
}

function printReferenceSample(
    referencedStores: ReferencedStore[],
    sampleLimit: number,
) {
    if (referencedStores.length === 0) {
        return;
    }

    console.log(
        `\nStore kandidat hapus yang masih direferensikan report (maks ${sampleLimit}):`,
    );
    referencedStores.slice(0, sampleLimit).forEach((item) => {
        console.log(`- ${item.storeCode} | report: ${item.reportCount}`);
    });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    const keepBranches = options.keepBranches.map((branch) =>
        normalizeBranchName(branch),
    );

    const storesToDelete = await prisma.store.findMany({
        where: {
            branchName: {
                notIn: keepBranches,
            },
        },
        select: {
            code: true,
            name: true,
            branchName: true,
        },
        orderBy: [{ branchName: "asc" }, { code: "asc" }],
    });

    const storeCodesToDelete = storesToDelete.map((store) => store.code);
    const storesToKeepCount = await prisma.store.count({
        where: {
            branchName: {
                in: keepBranches,
            },
        },
    });
    const allStoresCount = await prisma.store.count();

    let referencedStores: ReferencedStore[] = [];
    let totalReferencedReports = 0;

    if (storeCodesToDelete.length > 0) {
        const groupedReferences = await prisma.report.groupBy({
            by: ["storeCode"],
            where: {
                storeCode: {
                    in: storeCodesToDelete,
                },
            },
            _count: {
                _all: true,
            },
        });

        referencedStores = groupedReferences
            .filter(
                (
                    item,
                ): item is { storeCode: string; _count: { _all: number } } =>
                    item.storeCode !== null && item._count._all > 0,
            )
            .map((item) => ({
                storeCode: item.storeCode,
                reportCount: item._count._all,
            }))
            .sort(
                (a, b) =>
                    b.reportCount - a.reportCount ||
                    a.storeCode.localeCompare(b.storeCode),
            );

        totalReferencedReports = referencedStores.reduce(
            (sum, current) => sum + current.reportCount,
            0,
        );
    }

    const referencedByCode = new Map(
        referencedStores.map((item) => [item.storeCode, item.reportCount]),
    );

    console.log("=== Prune Store By Branch ===");
    console.log(`Branch dipertahankan : ${keepBranches.join(", ")}`);
    console.log(`Total store sekarang : ${allStoresCount}`);
    console.log(`Store dipertahankan  : ${storesToKeepCount}`);
    console.log(`Store kandidat hapus : ${storesToDelete.length}`);
    console.log(
        `Kandidat yang direferensikan report: ${referencedStores.length} store / ${totalReferencedReports} report`,
    );

    printStoreSample(storesToDelete, referencedByCode, options.sampleLimit);
    printReferenceSample(referencedStores, options.sampleLimit);

    if (!options.execute) {
        console.log("\nDRY-RUN selesai. Tidak ada data yang dihapus.");
        console.log(
            "Gunakan --execute untuk menjalankan penghapusan. Tambahkan --detach-reports jika ingin memutus relasi report terlebih dahulu.",
        );
        return;
    }

    if (storesToDelete.length === 0) {
        console.log("\nTidak ada store yang perlu dihapus.");
        return;
    }

    if (referencedStores.length > 0 && !options.detachReports) {
        throw new Error(
            "Ditemukan store yang masih direferensikan report. Jalankan ulang dengan --detach-reports untuk set report.storeCode = null sebelum delete.",
        );
    }

    const executionResult = await prisma.$transaction(async (tx) => {
        let detachedReports = 0;

        if (options.detachReports && referencedStores.length > 0) {
            const detached = await tx.report.updateMany({
                where: {
                    storeCode: {
                        in: referencedStores.map((item) => item.storeCode),
                    },
                },
                data: {
                    storeCode: null,
                },
            });
            detachedReports = detached.count;
        }

        const deleted = await tx.store.deleteMany({
            where: {
                code: {
                    in: storeCodesToDelete,
                },
            },
        });

        return {
            detachedReports,
            deletedStores: deleted.count,
        };
    });

    console.log("\nEksekusi selesai.");
    console.log(`Report diputus relasi : ${executionResult.detachedReports}`);
    console.log(`Store berhasil dihapus: ${executionResult.deletedStores}`);
}

main()
    .catch((error) => {
        console.error("Script prune store gagal:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
