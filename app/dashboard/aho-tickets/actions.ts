"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { getAuthUser, requireRole } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { SETTING_KEYS, updateAppSetting } from "@/lib/app-settings";

export type AdminAhoTicketFilters = {
    search?: string;
    branchName?: string;
    status?: string;
};

// ─── List (cursor-based infinite scroll) ─────────────────────────────────────

export async function getAdminAhoTickets(
    cursor: string | null,
    limit: number = 20,
    filters: AdminAhoTicketFilters,
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    try {
        const where: Prisma.MasterAhoTicketWhereInput = {};

        if (filters.search) {
            where.OR = [
                { storeCode: { contains: filters.search, mode: "insensitive" } },
                { problemNo: { contains: filters.search, mode: "insensitive" } },
                { branchName: { contains: filters.search, mode: "insensitive" } },
                { status: { contains: filters.search, mode: "insensitive" } },
                { store: { name: { contains: filters.search, mode: "insensitive" } } },
            ];
        }

        if (filters.branchName) {
            where.branchName = { contains: filters.branchName, mode: "insensitive" };
        }

        if (filters.status && filters.status !== "all") {
            where.status = { equals: filters.status, mode: "insensitive" };
        }

        const totalCount = await prisma.masterAhoTicket.count({ where });

        const tickets = await prisma.masterAhoTicket.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: [{ storeCode: "asc" }, { problemNo: "asc" }],
            include: {
                store: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        let nextCursor: string | null = null;
        if (tickets.length > limit) {
            const next = tickets.pop();
            nextCursor = next!.id;
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminAhoTickets", correlationId, durationMs, count: tickets.length },
            "Fetched admin aho tickets successfully",
        );

        return { tickets, nextCursor, totalCount };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminAhoTickets", correlationId, durationMs },
            "Failed to fetch admin aho tickets",
            error,
        );
        throw new Error("Gagal memuat data tiket AHO");
    }
}

// ─── Import tiket AHO dari XLSX (Format B — IRIS Alfamart) ───────────────────

const MAX_IMPORT_ERRORS = 50;

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

function parseFormatBXlsx(buffer: ArrayBuffer): ParseFormatBResult {
    // raw:true agar xlsx tidak memformat semua sel — jauh lebih cepat untuk 191k baris
    const wb = XLSX.read(buffer, { type: "array", raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], printDate: null, error: "File XLSX kosong (tidak ada sheet)" };

    const ws = wb.Sheets[sheetName];
    const ref = ws["!ref"];
    if (!ref) return { rows: [], printDate: null, error: "File XLSX tidak memiliki data" };

    // Decode range dari sheet reference (misal "A1:T191181")
    const range = XLSX.utils.decode_range(ref);
    const R_MIN = range.s.r; // baris pertama (0-indexed)
    const R_MAX = range.e.r; // baris terakhir
    const C_MAX = range.e.c; // kolom terakhir

    // ── Helper: baca sel secara langsung (tanpa sheet_to_json) ──
    // Ini menghindari konversi semua 3.8 juta sel; hanya baca yang kita butuhkan.
    const cellStr = (r: number, c: number): string => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) return "";
        // Untuk sel teks gunakan .v (raw value); untuk semua tipe konversi ke string
        return String(cell.v ?? "").trim();
    };

    // ── Ekstraksi Tanggal Cetak dari baris-baris awal ──
    let printDate: Date | null = null;
    for (let r = R_MIN; r <= Math.min(R_MIN + 20, R_MAX); r++) {
        const firstCell = cellStr(r, 0).toLowerCase();
        if (firstCell === "tanggal cetak") {
            const rawVal = cellStr(r, 1).replace(/^:\s*/, "");
            // Format dari IRIS: "12-Aug-2026 - 10:50:12" atau "12 Aug 2026 - 10:50:12"
            const normalized = rawVal.replace(" - ", " ");
            // IRIS Alfamart selalu menggunakan timezone WIB (UTC+7).
            // Tanpa suffix timezone, new Date() menginterpretasikan waktu sebagai UTC
            // sehingga tampilan di browser menjadi +7 jam (salah). Tambahkan +07:00 agar benar.
            const parsed = new Date(normalized + " +07:00");
            if (!isNaN(parsed.getTime())) printDate = parsed;
            break;
        }
    }


    // ── Temukan baris header secara dinamis ──
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

    // Validasi kolom wajib
    const requiredFields = ["storeCode", "problemNo", "status"] as const;
    const missingFields = requiredFields.filter((f) => colIndexMap[f] === undefined);
    if (missingFields.length > 0) {
        return {
            rows: [],
            printDate,
            error: `Kolom wajib tidak ditemukan: ${missingFields.join(", ")}. Pastikan menggunakan file AHO dari IRIS.`,
        };
    }

    // ── Parse baris data: hanya baca 5 kolom yang dibutuhkan, skip baris kosong ──
    // Dengan akses sel langsung (bukan sheet_to_json), kita menghindari konversi
    // semua ~3.8 juta sel — hanya kolom storeCode, problemNo, status, branchCode, branchName.
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

/**
 * Batch UPSERT ke MasterAhoTicket menggunakan PostgreSQL ON CONFLICT.
 * Diproses dalam chunk 1.000 baris (5.000 params) agar aman dari batas parameter PostgreSQL.
 * Menghitung created vs updated via xmax trick (xmax=0 → INSERT baru, xmax≠0 → UPDATE).
 */
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

    // Chunk agar tidak melebihi batas parameter PostgreSQL (65535).
    // 1000 rows × 5 params = 5000 params per query — aman dan cepat.
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

export async function adminImportAhoTickets(formData: FormData) {
    const startTime = Date.now();
    const result = {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        total: 0,
        printDate: null as Date | null,
        errors: [] as string[],
        duplicates: [] as string[],
    };

    try {
        const admin = await requireRole(["ADMIN"]);
        const headersList = await headers();

        // CSRF validation
        const origin = headersList.get("origin") ?? "";
        const host = headersList.get("host") ?? "";
        const isValid =
            origin === "" ||
            origin.includes(host) ||
            process.env.NODE_ENV === "development";
        if (!isValid) {
            return { ...result, errors: ["Request tidak valid"] };
        }

        const file = formData.get("file") as File | null;
        if (!file || !(file instanceof File)) {
            return { ...result, errors: ["File tidak ditemukan"] };
        }
        if (!file.name.endsWith(".xlsx")) {
            return { ...result, errors: ["Hanya menerima file .xlsx"] };
        }

        const buffer = await file.arrayBuffer();
        const { rows: allRows, printDate, error } = parseFormatBXlsx(buffer);
        if (error) return { ...result, errors: [error] };

        result.printDate = printDate;
        result.total = allRows.length;

        // ── Filter: hanya New dan Progress ──
        const VALID_STATUSES = ["New", "Progress"];
        const activeRows: ParsedRow[] = [];

        for (const row of allRows) {
            const status =
                row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase();
            if (VALID_STATUSES.includes(status)) {
                activeRows.push({ ...row, status });
            } else {
                result.skipped++;
            }
        }

        // ── Validasi Kode Toko ke database ──
        const codesInFile = new Set(activeRows.map((r) => r.storeCode));
        const validStoreCodes = new Set(
            (
                await prisma.store.findMany({
                    where: { code: { in: Array.from(codesInFile) } },
                    select: { code: true },
                })
            ).map((s) => s.code),
        );

        // Deduplikasi dalam file: gunakan Map, last-row wins
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

        // ── Ambil semua tiket yang saat ini ada di DB ──
        const existingTickets = await prisma.masterAhoTicket.findMany({
            select: { id: true, storeCode: true, problemNo: true, status: true, branchCode: true, branchName: true },
        });
        const existingMap = new Map(
            existingTickets.map((t) => [`${t.storeCode}_${t.problemNo}`, t]),
        );
        const existingById = new Map(existingTickets.map((t) => [t.id, t]));

        // ── Klasifikasikan operasi Create / Update / Delete ──
        const toCreate: { storeCode: string; problemNo: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toUpdate: { id: string; status: string; branchCode: string | null; branchName: string | null }[] = [];
        const toDeleteIds: string[] = [];

        // Tiket dari Excel → Create atau Update
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

        // Tiket di DB yang tidak ditemukan lagi di Excel (atau statusnya sudah bukan New/Progress)
        for (const [key, existing] of existingMap.entries()) {
            if (!incomingMap.has(key)) {
                toDeleteIds.push(existing.id);
            }
        }

        // ── Eksekusi: UPSERT semua incoming rows (Create + Update dalam satu query) ──
        // Menggantikan interactive transaction yang timeout karena N sequential updates.
        // PostgreSQL ON CONFLICT DO UPDATE memproses 9k baris dalam satu roundtrip.
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

        // ── Delete: tiket di DB yang tidak ada lagi di incoming file ──
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

        // ── Simpan Tanggal Cetak ke AppSetting ──
        if (printDate) {
            await updateAppSetting(
                SETTING_KEYS.AHO_LAST_PRINT_DATE,
                printDate.toISOString(),
                admin.NIK,
            );
        }

        revalidatePath("/dashboard/aho-tickets");

        logger.info(
            {
                operation: "adminImportAhoTickets",
                userId: admin.NIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                deleted: result.deleted,
                duration: Date.now() - startTime,
            },
            "Admin bulk AHO ticket sync completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "adminImportAhoTickets" },
            "Failed to sync AHO tickets",
            error,
        );
        return {
            ...result,
            errors: [...result.errors, "Gagal melakukan sinkronisasi (Kesalahan server)"],
        };
    }
}

// ─── Fetch Active Tickets for Store (Client Form) ────────────────────────────────

export async function getActiveAhoTickets(storeCode: string) {
    try {
        const user = await getAuthUser();
        if (!user) return [];

        const tickets = await prisma.masterAhoTicket.findMany({
            where: {
                storeCode: storeCode,
                status: { in: ["New", "Progress"] },
            },
            select: { problemNo: true },
            orderBy: { problemNo: "asc" },
        });

        return tickets.map(t => t.problemNo);
    } catch (error) {
        logger.error({ operation: "getActiveAhoTickets", storeCode }, "Failed to fetch tickets", error);
        return [];
    }
}

// ─── CRUD Actions for Manual Management ──────────────────────────────────────

export async function adminCreateAhoTicket(data: {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode?: string;
    branchName?: string;
}) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        let normalizedBranchName = data.branchName?.trim() || null;
        if (normalizedBranchName && normalizedBranchName.toUpperCase().startsWith("DC ")) {
            normalizedBranchName = normalizedBranchName.substring(3).trim();
        }

        const ticket = await prisma.masterAhoTicket.create({
            data: {
                storeCode: data.storeCode.trim().toUpperCase(),
                problemNo: data.problemNo.trim(),
                status: data.status,
                branchCode: data.branchCode?.trim() || null,
                branchName: normalizedBranchName,
            }
        });
        revalidatePath("/dashboard/aho-tickets");
        return { ticket };
    } catch (e: any) {
        if (e.code === "P2002") return { error: "Tiket dengan toko dan nomor problem ini sudah ada." };
        if (e.code === "P2003") return { error: "Toko dengan kode tersebut tidak ditemukan." };
        return { error: "Gagal menyimpan tiket AHO." };
    }
}

export async function adminUpdateAhoTicket(id: string, data: {
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode?: string;
    branchName?: string;
}) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        let normalizedBranchName = data.branchName?.trim() || null;
        if (normalizedBranchName && normalizedBranchName.toUpperCase().startsWith("DC ")) {
            normalizedBranchName = normalizedBranchName.substring(3).trim();
        }

        const ticket = await prisma.masterAhoTicket.update({
            where: { id },
            data: {
                storeCode: data.storeCode.trim().toUpperCase(),
                problemNo: data.problemNo.trim(),
                status: data.status,
                branchCode: data.branchCode?.trim() || null,
                branchName: normalizedBranchName,
            }
        });
        revalidatePath("/dashboard/aho-tickets");
        return { ticket };
    } catch (e: any) {
        if (e.code === "P2002") return { error: "Tiket dengan toko dan nomor problem ini sudah ada." };
        if (e.code === "P2003") return { error: "Toko dengan kode tersebut tidak ditemukan." };
        return { error: "Gagal mengupdate tiket AHO." };
    }
}

export async function adminDeleteAhoTicket(id: string) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") return { error: "Unauthorized" };

        await prisma.masterAhoTicket.delete({ where: { id } });
        revalidatePath("/dashboard/aho-tickets");
        return { success: true };
    } catch (e: any) {
        return { error: "Gagal menghapus tiket AHO." };
    }
}
