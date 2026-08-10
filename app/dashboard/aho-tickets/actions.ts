"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser, requireRole } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

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

// ─── Import tiket AHO dari XLSX ──────────────────────────────────────────────────

const MAX_IMPORT_ERRORS = 50;

function parseXlsx(
    buffer: ArrayBuffer,
    requiredHeaders: string[],
): { rows: Record<string, string>[]; error?: string } {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], error: "File XLSX kosong (tidak ada sheet)" };

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
        wb.Sheets[sheetName],
        { defval: "", raw: false },
    );

    if (rows.length === 0) return { rows: [], error: "File XLSX tidak memiliki data" };

    const fileHeaders = Object.keys(rows[0]);
    const missing = requiredHeaders.filter(
        (h) => !fileHeaders.some((fh) => fh.replace(/\s+/g, " ").trim().toLowerCase() === h.toLowerCase()),
    );
    if (missing.length > 0) {
        return {
            rows: [],
            error: `Header tidak valid. Kolom yang hilang: ${missing.join(", ")}. Pastikan menggunakan template yang benar.`,
        };
    }

    // Map keys to exact case expected
    const mappedRows = rows.map((row) => {
        const mapped: Record<string, string> = {};
        for (const key of Object.keys(row)) {
            const normalizedKey = key.replace(/\s+/g, " ").trim();
            // Find if this key matches any required header case-insensitively
            const matchedHeader = requiredHeaders.find(
                (h) => h.toLowerCase() === normalizedKey.toLowerCase()
            );
            if (matchedHeader) {
                mapped[matchedHeader] = row[key];
            } else {
                mapped[normalizedKey] = row[key];
            }
        }
        return mapped;
    });

    return { rows: mappedRows };
}

export async function adminImportAhoTickets(formData: FormData) {
    const startTime = Date.now();
    const result = {
        success: false,
        created: 0,
        skipped: 0,
        total: 0,
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
        const { rows, error } = parseXlsx(buffer, [
            "Kode Toko",
            "No Problem",
            "Status",
            "Kode Cabang Existing",
            "Nama Cabang Existing",
        ]);
        if (error) return { ...result, errors: [error] };

        result.total = rows.length;

        // Valid statuses
        const VALID_STATUSES = ["New", "Progress"];

        // Data processing map: key -> { storeCode, problemNo, status, branchCode, branchName, rowNum }
        // Using a map ensures duplicates are overwritten by the last occurrence
        const validTickets = new Map<string, { storeCode: string; problemNo: string; status: string; branchCode?: string; branchName?: string; rowNum: number }>();
        const codesInFile = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const storeCode = row["Kode Toko"]?.trim().toUpperCase();
            const problemNo = row["No Problem"]?.trim();
            const statusRaw = row["Status"]?.trim();
            let branchCode = row["Kode Cabang Existing"]?.trim();
            let branchName = row["Nama Cabang Existing"]?.trim();

            if (branchName && branchName.toUpperCase().startsWith("DC ")) {
                branchName = branchName.substring(3).trim();
            }

            if (!storeCode || !problemNo || !statusRaw) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`Baris ${rowNum}: Kode Toko, No Problem, atau Status kosong`);
                }
                continue;
            }

            // Capitalize first letter of status to match "New" or "Progress"
            const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();

            if (!VALID_STATUSES.includes(status)) {
                result.skipped++;
                // Skip menambahkan ke result.errors untuk mengurangi spam error teks merah
                continue;
            }

            codesInFile.add(storeCode);

            const key = `${storeCode}_${problemNo}`;
            if (validTickets.has(key)) {
                if (result.duplicates.length < MAX_IMPORT_ERRORS) {
                    result.duplicates.push(`Baris ${rowNum}: Duplikat untuk ${storeCode} - ${problemNo}. Menggunakan data baris terakhir.`);
                }
            }
            validTickets.set(key, { storeCode, problemNo, status, branchCode, branchName, rowNum });
        }

        // Validate store codes against database
        const validStoreCodes = new Set(
            (
                await prisma.store.findMany({
                    where: { code: { in: Array.from(codesInFile) } },
                    select: { code: true },
                })
            ).map((store) => store.code)
        );

        const dataToInsert = [];
        for (const [key, ticket] of validTickets.entries()) {
            if (!validStoreCodes.has(ticket.storeCode)) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`Baris ${ticket.rowNum} (${ticket.storeCode}): Kode Toko tidak ditemukan di sistem`);
                }
                continue;
            }
            dataToInsert.push({
                storeCode: ticket.storeCode,
                problemNo: ticket.problemNo,
                status: ticket.status,
                branchCode: ticket.branchCode,
                branchName: ticket.branchName,
            });
        }

        // Insert new data, skip duplicates
        const createResult = await prisma.masterAhoTicket.createMany({
            data: dataToInsert,
            skipDuplicates: true,
        });

        result.created = createResult.count;
        result.skipped += (dataToInsert.length - createResult.count);
        result.success = true;
        revalidatePath("/dashboard/aho-tickets");

        logger.info(
            {
                operation: "adminImportAhoTickets",
                userId: admin.NIK,
                total: result.total,
                created: result.created,
                duration: Date.now() - startTime,
            },
            "Admin bulk AHO ticket import completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "adminImportAhoTickets" },
            "Failed to import AHO tickets",
            error,
        );
        return {
            ...result,
            errors: [...result.errors, "Gagal melakukan import (Kesalahan server)"],
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
