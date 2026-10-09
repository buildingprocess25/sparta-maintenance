import { google } from "googleapis";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import * as XLSX from "xlsx";

type SheetCell = string | number | boolean | null | undefined;

export type SheetBmsRow = {
    sheetName: string;
    rowIndex: number;
    storeCode: string;
    storeName: string;
    bmsNIK: string | null;
    bmsName: string | null;
};

export type SyncBmsCoverageResult = {
    totalSheetsProcessed: number;
    sheetNames: string[];
    totalRowsParsed: number;
    created: number;
    deactivated: number;
    unchanged: number;
    skippedMissingStores: string[];
    skippedInvalidNiks: number;
    resolvedByName: number;
    resolvedByFuzzy: number;
    resolvedLogs: Array<{
        storeCode: string;
        sheetNik: string | null;
        sheetName: string | null;
        dbNik: string;
        method: string;
    }>;
    details: {
        newAssignments: Array<{ storeCode: string; bmsNIK: string }>;
        deactivatedAssignments: Array<{ storeCode: string; oldBmsNIK: string }>;
    };
};

const HEADER_ALIASES = {
    code: ["kode toko", "kode", "code", "store code"],
    bmsNik: ["nik bms", "bms nik", "nik", "nik_bms"],
    bmsName: ["nama bms", "bms name", "nama_bms"],
} as const;

function requiredEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} env variable is not set`);
    return value;
}

export function normalizeBmsNik(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str.toUpperCase() === "VACANT" || str.toUpperCase() === "NAN") return null;

    const num = Number(str);
    if (Number.isFinite(num)) {
        return String(Math.floor(num)).padStart(8, "0");
    }

    if (/^\d+$/.test(str)) {
        return str.padStart(8, "0");
    }

    return null;
}

function normalizeHeader(value: SheetCell) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

function findHeaderIndex(header: readonly SheetCell[], aliases: readonly string[]) {
    return header.findIndex((cell) => aliases.includes(normalizeHeader(cell)));
}

export function parseBmsCoverageSheetRows(
    rows: readonly (readonly SheetCell[])[],
    sheetName: string,
): SheetBmsRow[] {
    if (rows.length === 0) return [];

    // Find header row (usually row 1, 2, or 3)
    let headerIndex = -1;
    let codeColIdx = -1;
    let nikColIdx = -1;
    let bmsNameColIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];
        if (!row) continue;
        const cIdx = findHeaderIndex(row, HEADER_ALIASES.code);
        const nIdx = findHeaderIndex(row, HEADER_ALIASES.bmsNik);
        if (cIdx !== -1 && nIdx !== -1) {
            headerIndex = i;
            codeColIdx = cIdx;
            nikColIdx = nIdx;
            bmsNameColIdx = findHeaderIndex(row, HEADER_ALIASES.bmsName);
            break;
        }
    }

    if (headerIndex === -1 || codeColIdx === -1 || nikColIdx === -1) {
        logger.warn(
            { operation: "syncBmsCoverage", sheetName, headerCandidate: String(rows[0] ?? "") },
            `Sheet "${sheetName}" tidak memiliki header "KODE TOKO" dan "NIK BMS" yang valid`,
        );
        return [];
    }

    const results: SheetBmsRow[] = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const storeCode = String(row[codeColIdx] ?? "").trim().toUpperCase();
        if (!storeCode) continue;

        const rawNik = row[nikColIdx];
        const bmsNIK = normalizeBmsNik(rawNik);
        const bmsName = bmsNameColIdx !== -1 ? String(row[bmsNameColIdx] ?? "").trim() || null : null;
        const storeName = String(row[codeColIdx + 1] ?? "").trim();

        results.push({
            sheetName,
            rowIndex: i + 1,
            storeCode,
            storeName,
            bmsNIK,
            bmsName,
        });
    }

    return results;
}

class BmsUserResolver {
    private nikMap = new Map<string, string>();
    private exactNameMap = new Map<string, string>();
    private fuzzyUsers: { nik: string; tokens: string[]; originalName: string }[] = [];

    constructor(users: { NIK: string; name: string }[]) {
        for (const u of users) {
            this.nikMap.set(u.NIK, u.NIK);
            
            const cleanName = (u.name || "").trim().toLowerCase();
            if (cleanName) {
                this.exactNameMap.set(cleanName.replace(/[^a-z0-9]/g, ""), u.NIK);
                this.fuzzyUsers.push({
                    nik: u.NIK,
                    originalName: cleanName,
                    tokens: cleanName.split(/\s+/).filter(Boolean),
                });
            }
        }
    }

    resolve(sheetNik: string | null, sheetName: string | null): { nik: string | null; method: "NIK" | "EXACT_NAME" | "FUZZY_NAME" | "NOT_FOUND" } {
        if (sheetNik && this.nikMap.has(sheetNik)) {
            return { nik: sheetNik, method: "NIK" };
        }

        if (!sheetName) return { nik: null, method: "NOT_FOUND" };

        const cleanSheetName = sheetName.trim().toLowerCase();
        const normName = cleanSheetName.replace(/[^a-z0-9]/g, "");
        if (this.exactNameMap.has(normName)) {
            return { nik: this.exactNameMap.get(normName)!, method: "EXACT_NAME" };
        }

        const sheetTokens = cleanSheetName.split(/\s+/).filter(Boolean);
        if (sheetTokens.length >= 2) {
            const sheetFirst2 = sheetTokens.slice(0, 2).join(" ");
            const sheetFirst3 = sheetTokens.slice(0, 3).join(" ");

            for (const dbUser of this.fuzzyUsers) {
                if (dbUser.tokens.length >= 3 && sheetTokens.length >= 3) {
                    const dbFirst3 = dbUser.tokens.slice(0, 3).join(" ");
                    if (dbFirst3 === sheetFirst3) return { nik: dbUser.nik, method: "FUZZY_NAME" };
                }

                if (dbUser.tokens.length >= 2 && sheetTokens.length >= 2) {
                    const dbFirst2 = dbUser.tokens.slice(0, 2).join(" ");
                    if (dbFirst2 === sheetFirst2) return { nik: dbUser.nik, method: "FUZZY_NAME" };
                }
            }
        }

        return { nik: null, method: "NOT_FOUND" };
    }
}

export async function syncBmsCoverageFromSheet(options?: { dryRun?: boolean }): Promise<SyncBmsCoverageResult> {
    const isDryRun = options?.dryRun ?? false;
    const spreadsheetId = requiredEnv("GOOGLE_BMS_COVERAGE_SPREADSHEET_ID");

    const auth = new google.auth.OAuth2(
        requiredEnv("GOOGLE_CLIENT_ID"),
        requiredEnv("GOOGLE_CLIENT_SECRET"),
    );
    auth.setCredentials({
        refresh_token: requiredEnv("GOOGLE_REFRESH_TOKEN"),
    });

    const drive = google.drive({ version: "v3", auth });

    let buffer: ArrayBuffer;
    try {
        const response = await drive.files.get(
            { fileId: spreadsheetId, alt: "media" },
            { responseType: "arraybuffer" }
        );
        buffer = response.data as ArrayBuffer;
    } catch (error: any) {
        const response = await drive.files.export(
            { fileId: spreadsheetId, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
            { responseType: "arraybuffer" }
        );
        buffer = response.data as ArrayBuffer;
    }

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetTitles = workbook.SheetNames;

    if (sheetTitles.length === 0) {
        throw new Error("Spreadsheet tidak memiliki sheet tab yang valid");
    }

    const allParsedRows: SheetBmsRow[] = [];

    for (const title of sheetTitles) {
        const worksheet = workbook.Sheets[title];
        if (!worksheet) continue;
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as SheetCell[][];
        const parsed = parseBmsCoverageSheetRows(rows, title);
        allParsedRows.push(...parsed);
    }

    // 3. Group parsed rows by storeCode (take last row if duplicate in spreadsheet)
    const latestSheetStoreMap = new Map<string, SheetBmsRow>();
    for (const item of allParsedRows) {
        latestSheetStoreMap.set(item.storeCode, item);
    }

    // 4. Query active stores in DB
    const dbStores = await prisma.store.findMany({
        where: { isActive: true },
        select: { code: true, name: true, branchName: true },
    });
    const dbStoreCodeSet = new Set(dbStores.map((s) => s.code));

    // 5. Query active BMS assignments in DB
    const activeAssignments = await prisma.bmsStoreAssignment.findMany({
        where: { isActive: true },
        select: { id: true, storeCode: true, bmsNIK: true },
    });
    const activeAssignmentByStoreCode = new Map(
        activeAssignments.map((a) => [a.storeCode, a]),
    );

    // 5.5 Fetch all users to initialize BmsUserResolver
    const dbUsers = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { NIK: true, name: true },
    });
    const bmsResolver = new BmsUserResolver(dbUsers);

    // 6. Calculate diff
    const skippedMissingStores: string[] = [];
    const newAssignments: Array<{ storeCode: string; bmsNIK: string }> = [];
    const deactivatedAssignments: Array<{ storeCode: string; oldBmsNIK: string }> = [];
    const resolvedLogs: Array<{ storeCode: string; sheetNik: string | null; sheetName: string | null; dbNik: string; method: string }> = [];
    const idsToDeactivate: string[] = [];
    const toCreateItems: Array<{
        id: string;
        storeCode: string;
        bmsNIK: string;
        isActive: boolean;
        notes: string;
    }> = [];

    let unchanged = 0;
    let skippedInvalidNiks = 0;
    let resolvedByName = 0;
    let resolvedByFuzzy = 0;

    for (const [storeCode, sheetItem] of latestSheetStoreMap.entries()) {
        // Check if store exists in DB
        if (!dbStoreCodeSet.has(storeCode)) {
            skippedMissingStores.push(storeCode);
            continue;
        }

        const activeInDb = activeAssignmentByStoreCode.get(storeCode);
        
        const resolved = bmsResolver.resolve(sheetItem.bmsNIK, sheetItem.bmsName);
        const targetNik = resolved.nik;

        if (resolved.method === "EXACT_NAME" || resolved.method === "FUZZY_NAME") {
            if (resolved.method === "EXACT_NAME") resolvedByName++;
            if (resolved.method === "FUZZY_NAME") resolvedByFuzzy++;
            resolvedLogs.push({
                storeCode,
                sheetNik: sheetItem.bmsNIK,
                sheetName: sheetItem.bmsName,
                dbNik: targetNik!,
                method: resolved.method,
            });
        }

        if (!targetNik) {
            // Vacant / invalid NIK in sheet
            skippedInvalidNiks++;
            if (activeInDb) {
                idsToDeactivate.push(activeInDb.id);
                deactivatedAssignments.push({
                    storeCode,
                    oldBmsNIK: activeInDb.bmsNIK,
                });
            }
            continue;
        }

        if (activeInDb) {
            if (activeInDb.bmsNIK === targetNik) {
                unchanged++;
            } else {
                // Mutated BMS assignment
                idsToDeactivate.push(activeInDb.id);
                deactivatedAssignments.push({
                    storeCode,
                    oldBmsNIK: activeInDb.bmsNIK,
                });
                toCreateItems.push({
                    id: crypto.randomUUID(),
                    storeCode,
                    bmsNIK: targetNik,
                    isActive: true,
                    notes: "Update otomatis dari Daily Sync BMS Coverage",
                });
                newAssignments.push({ storeCode, bmsNIK: targetNik });
            }
        } else {
            // New assignment for unassigned store
            toCreateItems.push({
                id: crypto.randomUUID(),
                storeCode,
                bmsNIK: targetNik,
                isActive: true,
                notes: "Penugasan baru dari Daily Sync BMS Coverage",
            });
            newAssignments.push({ storeCode, bmsNIK: targetNik });
        }
    }

    // 7. Execute Prisma Transaction
    if (!isDryRun && (idsToDeactivate.length > 0 || toCreateItems.length > 0)) {
        await prisma.$transaction(
            async (tx) => {
                if (idsToDeactivate.length > 0) {
                    await tx.bmsStoreAssignment.updateMany({
                        where: { id: { in: idsToDeactivate } },
                        data: {
                            isActive: false,
                            unassignedAt: new Date(),
                            notes: "Digantikan oleh Daily Sync BMS Coverage baru",
                        },
                    });
                }

                if (toCreateItems.length > 0) {
                    await tx.bmsStoreAssignment.createMany({
                        data: toCreateItems,
                        skipDuplicates: true,
                    });
                }
            },
            {
                maxWait: 15000,
                timeout: 60000,
            },
        );
    }

    const result: SyncBmsCoverageResult = {
        totalSheetsProcessed: sheetTitles.length,
        sheetNames: sheetTitles,
        totalRowsParsed: allParsedRows.length,
        created: toCreateItems.length,
        deactivated: idsToDeactivate.length,
        unchanged,
        skippedMissingStores,
        skippedInvalidNiks,
        resolvedByName,
        resolvedByFuzzy,
        resolvedLogs,
        details: {
            newAssignments,
            deactivatedAssignments,
        },
    };

    logger.info(
        {
            operation: "syncBmsCoverage",
            summary: {
                sheets: result.totalSheetsProcessed,
                parsedRows: result.totalRowsParsed,
                created: result.created,
                deactivated: result.deactivated,
                unchanged: result.unchanged,
                skippedMissingStoresCount: result.skippedMissingStores.length,
                resolvedByName: result.resolvedByName,
                resolvedByFuzzy: result.resolvedByFuzzy,
            },
        },
        "Hasil eksekusi Daily Sync BMS Coverage",
    );

    return result;
}
