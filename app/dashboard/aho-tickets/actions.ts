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
                { store: { name: { contains: filters.search, mode: "insensitive" } } },
            ];
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
        (h) => !fileHeaders.some((fh) => fh.trim().toLowerCase() === h.toLowerCase()),
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
            const trimmedKey = key.trim();
            // Find if this key matches any required header case-insensitively
            const matchedHeader = requiredHeaders.find(
                (h) => h.toLowerCase() === trimmedKey.toLowerCase()
            );
            if (matchedHeader) {
                mapped[matchedHeader] = row[key];
            } else {
                mapped[trimmedKey] = row[key];
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
        ]);
        if (error) return { ...result, errors: [error] };

        result.total = rows.length;

        // Valid statuses
        const VALID_STATUSES = ["New", "Progress"];

        // Data processing map: key -> { storeCode, problemNo, status, rowNum }
        // Using a map ensures duplicates are overwritten by the last occurrence
        const validTickets = new Map<string, { storeCode: string; problemNo: string; status: string; rowNum: number }>();
        const codesInFile = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const storeCode = row["Kode Toko"]?.trim().toUpperCase();
            const problemNo = row["No Problem"]?.trim();
            const statusRaw = row["Status"]?.trim();

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
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`Baris ${rowNum} (${storeCode}/${problemNo}): Status '${statusRaw}' tidak aktif (hanya menerima New/Progress)`);
                }
                continue;
            }

            codesInFile.add(storeCode);

            const key = `${storeCode}_${problemNo}`;
            if (validTickets.has(key)) {
                if (result.duplicates.length < MAX_IMPORT_ERRORS) {
                    result.duplicates.push(`Baris ${rowNum}: Duplikat untuk ${storeCode} - ${problemNo}. Menggunakan data baris terakhir.`);
                }
            }
            validTickets.set(key, { storeCode, problemNo, status, rowNum });
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
            });
        }

        // Full sync: Delete all and insert new
        await prisma.$transaction([
            prisma.masterAhoTicket.deleteMany({}),
            prisma.masterAhoTicket.createMany({
                data: dataToInsert,
            }),
        ]);

        result.created = dataToInsert.length;
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
