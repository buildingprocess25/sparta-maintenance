import assert from "node:assert/strict";
import fs from "node:fs";
import prisma from "../lib/prisma";

const BRANCH_MERGES = new Map<string, string>([
    ["BOGOR", "CILEUNGSI RAYA"],
    ["BEKASI", "CILEUNGSI RAYA"],
    ["KARAWANG", "CILEUNGSI RAYA"],
    ["CILEUNGSI 2", "CILEUNGSI RAYA"],
    ["BALARAJA", "CIKOKOL RAYA"],
    ["SERANG", "CIKOKOL RAYA"],
    ["PARUNG", "CIKOKOL RAYA"],
    ["CIKOKOL", "CIKOKOL RAYA"],
]);

const OLD_BRANCHES = [...BRANCH_MERGES.keys()];
const STORE_AREA_CSV = "backup/branch-area-backup.csv";
const USER_AREA_CSV = "backup/user-area.csv";
const BATCH_SIZE = 500;
const PJUM_PAGE_SIZE = 200;

function normalizeAreaName(areaName: string) {
    return areaName.trim().replaceAll("_", " ");
}

function normalizeUserBranches(branchNames: string[]) {
    const next = branchNames.map((branchName) => {
        const trimmed = branchName.trim();
        return BRANCH_MERGES.get(trimmed) ?? trimmed;
    });

    return [...new Set(next)].filter(Boolean);
}

function sameStringArray(left: string[], right: string[]) {
    return (
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    );
}

function chunk<T>(items: T[], size = BATCH_SIZE) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function logProgress(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function parseStoreAreaCsv(path = STORE_AREA_CSV) {
    const rows = fs.readFileSync(path, "utf8").split(/\r?\n/).slice(1);
    const map = new Map<string, string>();

    for (const row of rows) {
        if (!row.trim()) continue;
        const [areaName, storeCode] = row.split(",");
        if (!areaName || !storeCode) continue;
        map.set(storeCode.trim().toUpperCase(), normalizeAreaName(areaName));
    }

    return map;
}

function parseUserAreaCsv(path = USER_AREA_CSV) {
    const rows = fs.readFileSync(path, "utf8").split(/\r?\n/).slice(1);
    const map = new Map<string, string[]>();

    for (const row of rows) {
        if (!row.trim()) continue;
        const commaIndex = row.indexOf(",");
        if (commaIndex < 0) continue;

        const nik = row.slice(0, commaIndex).trim();
        const rawAreas = row.slice(commaIndex + 1).trim();
        if (!nik || !rawAreas) continue;

        const areas = JSON.parse(rawAreas) as string[];
        map.set(nik, [...new Set(areas.map(normalizeAreaName))]);
    }

    return map;
}

function assertNormalizeUserBranches() {
    assert.deepEqual(normalizeUserBranches(["BOGOR"]), ["CILEUNGSI RAYA"]);
    assert.deepEqual(normalizeUserBranches(["BOGOR", "BEKASI"]), [
        "CILEUNGSI RAYA",
    ]);
    assert.deepEqual(normalizeUserBranches(["SERANG", "HEAD OFFICE"]), [
        "CIKOKOL RAYA",
        "HEAD OFFICE",
    ]);
    assert.equal(BRANCH_MERGES.get("CIKOKOL"), "CIKOKOL RAYA");
    assert.deepEqual(parseUserAreaCsv().get("03100115"), [
        "BEKASI",
        "KARAWANG",
    ]);
}

async function main() {
    if (process.argv.includes("--self-test")) {
        assertNormalizeUserBranches();
        console.log("✅ Self-test passed");
        return;
    }

    const execute = process.argv.includes("--execute");
    const storeAreaMap = parseStoreAreaCsv();
    const userAreaMap = parseUserAreaCsv();
    const usersToInspect = Array.from(userAreaMap.keys());

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { branchNames: { hasSome: OLD_BRANCHES } },
                { NIK: { in: usersToInspect } },
            ],
        },
        select: { NIK: true, name: true, branchNames: true, areaNames: true },
        orderBy: { NIK: "asc" },
    });

    const userUpdates = users
        .map((user) => ({
            ...user,
            nextBranchNames: normalizeUserBranches(user.branchNames),
            nextAreaNames: userAreaMap.get(user.NIK) ?? user.areaNames,
        }))
        .filter(
            (user) =>
                !sameStringArray(user.branchNames, user.nextBranchNames) ||
                !sameStringArray(user.areaNames, user.nextAreaNames),
        );

    const storeCounts = await Promise.all(
        OLD_BRANCHES.map((branchName) =>
            prisma.store.count({ where: { branchName } }),
        ),
    );
    const reportCounts = await Promise.all(
        OLD_BRANCHES.map((branchName) =>
            prisma.report.count({ where: { branchName } }),
        ),
    );
    const pjumCounts = await Promise.all(
        OLD_BRANCHES.map((branchName) =>
            prisma.pjumExport.count({ where: { branchName } }),
        ),
    );
    const totalStores = storeCounts.reduce((sum, count) => sum + count, 0);
    const totalReports = reportCounts.reduce((sum, count) => sum + count, 0);
    const totalPjumExports = pjumCounts.reduce((sum, count) => sum + count, 0);

    console.log(execute ? "Mode: EXECUTE" : "Mode: DRY RUN");
    console.log(`Users to update : ${userUpdates.length}`);
    console.log(`Stores to update: ${totalStores}`);
    console.log(`Reports to update: ${totalReports}`);
    console.log(`PJUM to update   : ${totalPjumExports}`);
    console.log(`Store area rows : ${storeAreaMap.size}`);
    console.log(`User area rows  : ${userAreaMap.size}`);

    for (const [index, branchName] of OLD_BRANCHES.entries()) {
        const target = BRANCH_MERGES.get(branchName);
        console.log(
            `- ${branchName} -> ${target}: ${storeCounts[index]} toko, ${reportCounts[index]} laporan, ${pjumCounts[index]} PJUM`,
        );
    }

    if (!execute) {
        console.log("\nJalankan dengan --execute untuk menyimpan perubahan.");
        return;
    }

    let updatedStores = 0;
    let updatedReports = 0;
    let updatedPjumExports = 0;
    logProgress("Updating merged branch names...");
    for (const branchName of OLD_BRANCHES) {
        const targetBranchName = BRANCH_MERGES.get(branchName)!;
        const storeResult = await prisma.store.updateMany({
            where: { branchName },
            data: { branchName: targetBranchName },
        });
        const reportResult = await prisma.report.updateMany({
            where: { branchName },
            data: { branchName: targetBranchName },
        });
        const pjumResult = await prisma.pjumExport.updateMany({
            where: { branchName },
            data: { branchName: targetBranchName },
        });
        updatedStores += storeResult.count;
        updatedReports += reportResult.count;
        updatedPjumExports += pjumResult.count;
    }
    logProgress("Merged branch names done.");

    const storesByArea = new Map<string, string[]>();
    for (const [storeCode, areaName] of storeAreaMap) {
        storesByArea.set(areaName, [
            ...(storesByArea.get(areaName) ?? []),
            storeCode,
        ]);
    }
    logProgress(`Updating store/report areas in ${storesByArea.size} groups...`);
    for (const [areaName, entries] of storesByArea) {
        let areaStores = 0;
        let areaReports = 0;
        for (const codes of chunk(entries)) {
            const storeResult = await prisma.store.updateMany({
                where: { code: { in: codes } },
                data: { areaName },
            });
            const reportResult = await prisma.report.updateMany({
                where: { storeCode: { in: codes } },
                data: { areaName },
            });
            areaStores += storeResult.count;
            areaReports += reportResult.count;
            updatedStores += storeResult.count;
            updatedReports += reportResult.count;
        }
        logProgress(
            `Area ${areaName}: ${areaStores} stores, ${areaReports} reports updated.`,
        );
    }

    let updatedUsers = 0;
    logProgress(`Updating ${userUpdates.length} users...`);
    for (const user of userUpdates) {
        await prisma.user.update({
            where: { NIK: user.NIK },
            data: {
                branchNames: user.nextBranchNames,
                areaNames: user.nextAreaNames,
            },
        });
        updatedUsers += 1;
    }
    logProgress("Users done.");

    logProgress("Updating PJUM areas...");
    let cursor: string | undefined;
    while (true) {
        const pjumExports = await prisma.pjumExport.findMany({
            take: PJUM_PAGE_SIZE,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: "asc" },
            select: { id: true, reportNumbers: true, areaNames: true },
        });

        if (pjumExports.length === 0) break;

        const reportNumbers = [
            ...new Set(pjumExports.flatMap((pjum) => pjum.reportNumbers)),
        ];
        const reports = await prisma.report.findMany({
            where: { reportNumber: { in: reportNumbers } },
            select: { reportNumber: true, areaName: true },
        });
        const reportAreaMap = new Map(
            reports.map((report) => [report.reportNumber, report.areaName]),
        );

        for (const pjum of pjumExports) {
            const areaNames = [
                ...new Set(
                    pjum.reportNumbers
                        .map((reportNumber) => reportAreaMap.get(reportNumber))
                        .filter(
                            (areaName): areaName is string =>
                                Boolean(areaName),
                        ),
                ),
            ];

            if (sameStringArray(pjum.areaNames, areaNames)) {
                continue;
            }

            await prisma.pjumExport.update({
                where: { id: pjum.id },
                data: { areaNames },
            });
            updatedPjumExports += 1;
        }

        cursor = pjumExports.at(-1)?.id;
        logProgress(`Processed ${pjumExports.length} PJUM rows.`);
    }

    console.log("✅ Branch user dan toko berhasil diperbarui");
    console.log(`- Users updated : ${updatedUsers}`);
    console.log(`- Stores updated: ${updatedStores}`);
    console.log(`- Reports updated: ${updatedReports}`);
    console.log(`- PJUM updated   : ${updatedPjumExports}`);
}

main()
    .catch((error) => {
        console.error("❌ Gagal merge branch:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
