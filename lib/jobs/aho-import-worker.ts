// lib/jobs/aho-import-worker.ts
// Script ini dijalankan oleh Node.js Worker Thread.
// JANGAN import modul Next.js atau React di sini.

import { workerData, parentPort } from "worker_threads";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SETTING_KEYS, updateAppSetting } from "@/lib/app-settings";
import * as XLSX from "xlsx";

if (!parentPort) {
    throw new Error("This file must be run as a Worker Thread");
}

// --- Types ---

type ParsedRow = {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode: string;
    branchName: string;
};

type ParseFormatBResult = {
    rows: ParsedRow[];
    printDate: Date | null;
    error?: string;
};

type AhoImportResult = {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
    printDate: string | null;
    errors: string[];
    duplicates: string[];
};

const MAX_IMPORT_ERRORS = 50;

// --- XLSX Parser ---

function parseFormatBXlsx(buffer: Buffer): ParseFormatBResult {
    const wb = XLSX.read(buffer, { type: "buffer", raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], printDate: null, error: "File XLSX kosong (tidak ada sheet)" };

    const ws = wb.Sheets[sheetName];
    const ref = ws["!ref"];
    if (!ref) return { rows: [], printDate: null, error: "File XLSX tidak memiliki data" };

    const range = XLSX.utils.decode_range(ref);
    const R_MIN = range.s.r;
    const R_MAX = range.e.r;
    const C_MAX = range.e.c;

    const cellStr = (r: number, c: number): string => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) return "";
        return String(cell.v ?? "").trim();
    };

    let printDate: Date | null = null;
    for (let r = R_MIN; r <= Math.min(R_MIN + 20, R_MAX); r++) {
        const firstCell = cellStr(r, 0).toLowerCase();
        if (firstCell === "tanggal cetak") {
            const rawVal = cellStr(r, 1).replace(/^:\s*/, "");
            const normalized = rawVal.replace(" - ", " ");
            const parsed = new Date(normalized + " +07:00");
            if (!isNaN(parsed.getTime())) printDate = parsed;
            break;
        }
    }

    const TARGET_COLS: Record<string, string[]> = {
        storeCode:  ["kode toko"],
        problemNo:  ["no. problem", "no problem"],
        status:     ["status"],
        branchCode: ["kode cabang existing"],
        branchName: ["cabang existing", "nama cabang existing"],
    };

    let headerRowIndex = -1;
    const colIndexMap: Record<string, number> = {};

    for (let r = R_MIN; r <= Math.min(R_MIN + 50, R_MAX); r++) {
        let foundProblemNo = false;
        let foundStoreCode = false;
        const cellsInRow: string[] = [];
        for (let c = 0; c <= C_MAX; c++) {
            cellsInRow.push(cellStr(r, c).toLowerCase());
        }
        for (let c = 0; c <= C_MAX; c++) {
            const txt = cellsInRow[c];
            if (TARGET_COLS.problemNo.includes(txt)) foundProblemNo = true;
            if (TARGET_COLS.storeCode.includes(txt)) foundStoreCode = true;
        }
        if (foundProblemNo && foundStoreCode) {
            headerRowIndex = r;
            for (const [field, aliases] of Object.entries(TARGET_COLS)) {
                for (let c = 0; c <= C_MAX; c++) {
                    if (aliases.includes(cellsInRow[c])) {
                        colIndexMap[field] = c;
                        break;
                    }
                }
            }
            break;
        }
    }

    if (headerRowIndex === -1) {
        return {
            rows: [],
            printDate,
            error: "Format file tidak dikenali. Pastikan file adalah laporan AHO dari sistem IRIS Alfamart.",
        };
    }

    const requiredFields = ["storeCode", "problemNo", "status"] as const;
    const missingFields = requiredFields.filter((f) => colIndexMap[f] === undefined);
    if (missingFields.length > 0) {
        return {
            rows: [],
            printDate,
            error: `Kolom wajib tidak ditemukan: ${missingFields.join(", ")}. Pastikan menggunakan file AHO dari IRIS.`,
        };
    }

    const rows: ParsedRow[] = [];
    const cStoreCode  = colIndexMap.storeCode;
    const cProblemNo  = colIndexMap.problemNo;
    const cStatus     = colIndexMap.status;
    const cBranchCode = colIndexMap.branchCode;
    const cBranchName = colIndexMap.branchName;

    for (let r = headerRowIndex + 1; r <= R_MAX; r++) {
        const storeCode = cellStr(r, cStoreCode).toUpperCase();
        const problemNo = cellStr(r, cProblemNo);
        const statusRaw = cellStr(r, cStatus);

        if (!storeCode || !problemNo || !statusRaw) continue;

        const branchCode = cBranchCode !== undefined ? cellStr(r, cBranchCode) : "";
        let branchName   = cBranchName !== undefined ? cellStr(r, cBranchName) : "";

        if (branchName.toUpperCase().startsWith("DC ")) {
            branchName = branchName.substring(3).trim();
        }

        rows.push({ storeCode, problemNo, status: statusRaw, branchCode, branchName });
    }

    return { rows, printDate };
}

// --- Bulk Upsert ---

async function upsertAhoTickets(
    rows: {
        storeCode: string;
        problemNo: string;
        status: string;
        branchCode: string | null;
        branchName: string | null;
    }[],
): Promise<{ created: number; updated: number }> {
    if (rows.length === 0) return { created: 0, updated: 0 };

    const CHUNK_SIZE = 1_000;
    let totalCreated = 0;
    let totalUpdated = 0;

    for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + CHUNK_SIZE);
        const placeholders: string[] = [];
        const values: (string | null)[] = [];

        chunk.forEach((row, i) => {
            const base = i * 5;
            placeholders.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
            );
            values.push(row.storeCode, row.problemNo, row.status, row.branchCode, row.branchName);
        });

        const sql = `
            INSERT INTO "MasterAhoTicket" ("id", "storeCode", "problemNo", "status", "branchCode", "branchName", "updatedAt")
            SELECT
                gen_random_uuid(),
                v."storeCode",
                v."problemNo",
                v."status",
                v."branchCode",
                v."branchName",
                NOW()
            FROM (VALUES ${placeholders.join(", ")}) AS v("storeCode", "problemNo", "status", "branchCode", "branchName")
            ON CONFLICT ("storeCode", "problemNo") DO UPDATE SET
                "status"     = EXCLUDED."status",
                "branchCode" = EXCLUDED."branchCode",
                "branchName" = EXCLUDED."branchName",
                "updatedAt"  = NOW()
            RETURNING (xmax = 0) AS is_insert
        `;

        const result = await prisma.$queryRawUnsafe<{ is_insert: boolean }[]>(sql, ...values);
        totalCreated += result.filter((r) => r.is_insert).length;
        totalUpdated += result.filter((r) => !r.is_insert).length;
    }

    return { created: totalCreated, updated: totalUpdated };
}

// --- Main Worker Execution ---

async function runWorker() {
    const { jobId, bufferBase64, requestedByNIK } = workerData as {
        jobId: string;
        bufferBase64: string;
        requestedByNIK: string;
    };

    const buffer = Buffer.from(bufferBase64, "base64");
    const startTime = Date.now();

    const result: AhoImportResult = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        total: 0,
        printDate: null,
        errors: [],
        duplicates: [],
    };

    try {
        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: { status: "processing", startedAt: new Date() },
        });

        const { rows: allRows, printDate, error } = parseFormatBXlsx(buffer);
        if (error) {
            result.errors.push(error);
            await prisma.ahoImportJob.update({
                where: { id: jobId },
                data: {
                    status: "failed",
                    errorMessage: error,
                    result: result as object,
                    completedAt: new Date(),
                    fileBuffer: Buffer.alloc(0),
                },
            });
            parentPort!.postMessage({ type: "done" });
            return;
        }

        result.printDate = printDate ? printDate.toISOString() : null;
        result.total = allRows.length;

        const VALID_STATUSES = ["New", "Progress"];
        const activeRows: ParsedRow[] = [];
        for (const row of allRows) {
            const status = row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase();
            if (VALID_STATUSES.includes(status)) {
                activeRows.push({ ...row, status });
            } else {
                result.skipped++;
            }
        }

        const codesInFile = new Set(activeRows.map((r) => r.storeCode));
        const validStoreCodes = new Set(
            (
                await prisma.store.findMany({
                    where: { code: { in: Array.from(codesInFile) } },
                    select: { code: true },
                })
            ).map((s) => s.code),
        );

        const incomingMap = new Map<
            string,
            { storeCode: string; problemNo: string; status: string; branchCode: string; branchName: string }
        >();
        for (const row of activeRows) {
            if (!validStoreCodes.has(row.storeCode)) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`(${row.storeCode}): Kode Toko tidak ditemukan di sistem`);
                }
                continue;
            }
            const key = `${row.storeCode}_${row.problemNo}`;
            if (incomingMap.has(key)) {
                if (result.duplicates.length < MAX_IMPORT_ERRORS) {
                    result.duplicates.push(`Duplikat dalam file: ${row.storeCode} - ${row.problemNo}. Menggunakan data terakhir.`);
                }
            }
            incomingMap.set(key, row);
        }

        const existingTickets = await prisma.masterAhoTicket.findMany({
            select: { id: true, storeCode: true, problemNo: true, status: true, branchCode: true, branchName: true },
        });
        const existingMap = new Map(existingTickets.map((t) => [`${t.storeCode}_${t.problemNo}`, t]));
        const existingById = new Map(existingTickets.map((t) => [t.id, t]));

        const toCreate: { storeCode: string; problemNo: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toUpdate: { id: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toDeleteIds: string[] = [];

        for (const [key, incoming] of incomingMap.entries()) {
            const existing = existingMap.get(key);
            if (!existing) {
                toCreate.push({
                    storeCode: incoming.storeCode,
                    problemNo: incoming.problemNo,
                    status: incoming.status,
                    branchCode: incoming.branchCode || null,
                    branchName: incoming.branchName || null,
                });
            } else {
                const statusChanged = existing.status !== incoming.status;
                const branchCodeChanged = (existing.branchCode ?? "") !== (incoming.branchCode ?? "");
                const branchNameChanged = (existing.branchName ?? "") !== (incoming.branchName ?? "");
                if (statusChanged || branchCodeChanged || branchNameChanged) {
                    toUpdate.push({
                        id: existing.id,
                        status: incoming.status,
                        branchCode: incoming.branchCode || null,
                        branchName: incoming.branchName || null,
                    });
                }
            }
        }

        for (const [key, existing] of existingMap.entries()) {
            if (!incomingMap.has(key)) {
                toDeleteIds.push(existing.id);
            }
        }

        const allIncoming = [
            ...toCreate,
            ...toUpdate.map(({ id: _id, ...data }) => {
                const existing = existingById.get(_id)!;
                return {
                    storeCode: existing.storeCode,
                    problemNo: existing.problemNo,
                    status: data.status,
                    branchCode: data.branchCode ?? null,
                    branchName: data.branchName ?? null,
                };
            }),
        ];

        const { created, updated } = await upsertAhoTickets(allIncoming);

        let deleted = 0;
        if (toDeleteIds.length > 0) {
            const deleteResult = await prisma.masterAhoTicket.deleteMany({
                where: { id: { in: toDeleteIds } },
            });
            deleted = deleteResult.count;
        }

        result.created = created;
        result.updated = updated;
        result.deleted = deleted;
        result.success = true;

        if (printDate) {
            await updateAppSetting(
                SETTING_KEYS.AHO_LAST_PRINT_DATE,
                printDate.toISOString(),
                requestedByNIK,
            );
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                operation: "processAhoImportJob",
                jobId,
                userId: requestedByNIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                deleted: result.deleted,
                duration,
            },
            "Admin bulk AHO ticket sync completed",
        );

        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: {
                status: "done",
                result: result as object,
                completedAt: new Date(),
                fileBuffer: Buffer.alloc(0),
            },
        });

        parentPort!.postMessage({ type: "done" });
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        logger.error(
            { operation: "processAhoImportJob", jobId },
            "Failed to process AHO import job",
            error,
        );
        await prisma.ahoImportJob.update({
            where: { id: jobId },
            data: {
                status: "failed",
                errorMessage: errMsg,
                result: result as object,
                completedAt: new Date(),
                fileBuffer: Buffer.alloc(0),
            },
        });
        parentPort!.postMessage({ type: "error", message: errMsg });
    } finally {
        await prisma.$disconnect();
    }
}

runWorker();
