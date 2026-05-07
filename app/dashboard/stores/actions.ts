"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { requireRole } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// Re-export so import dialog can use without cross-module import
export type { ImportResult } from "@/app/admin/database/actions";

export type AdminStoreFilters = {
    search?: string;
    branchName?: string; // "all" = no filter
};

// ─── List (cursor-based infinite scroll) ─────────────────────────────────────

export async function getAdminStores(
    cursor: string | null,
    limit: number = 20,
    filters: AdminStoreFilters,
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    try {
        const where: Prisma.StoreWhereInput = {};

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { code: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.branchName && filters.branchName !== "all") {
            where.branchName = filters.branchName;
        }

        const totalCount = await prisma.store.count({ where });

        const stores = await prisma.store.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { code: cursor } : undefined,
            orderBy: [{ branchName: "asc" }, { name: "asc" }],
            select: {
                code: true,
                name: true,
                branchName: true,
                isActive: true,
            },
        });

        let nextCursor: string | null = null;
        if (stores.length > limit) {
            const next = stores.pop();
            nextCursor = next!.code;
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminStores", correlationId, durationMs, count: stores.length },
            "Fetched admin stores successfully",
        );

        return { stores, nextCursor, totalCount };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminStores", correlationId, durationMs },
            "Failed to fetch admin stores",
            error,
        );
        throw new Error("Gagal memuat data toko");
    }
}

// ─── Export (fetch all for XLSX generation) ───────────────────────────────────

export type ExportStoreFilters = {
    selectedBranches?: string[]; // [] = all branches
};

export async function exportAdminStores(filters: ExportStoreFilters) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "ADMIN") throw new Error("Unauthorized");

    try {
        const where: Prisma.StoreWhereInput = {};

        if (filters.selectedBranches && filters.selectedBranches.length > 0) {
            where.branchName = { in: filters.selectedBranches };
        }

        const stores = await prisma.store.findMany({
            where,
            orderBy: [{ branchName: "asc" }, { name: "asc" }],
            select: {
                code: true,
                name: true,
                branchName: true,
                isActive: true,
            },
        });

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "exportAdminStores", correlationId, durationMs, count: stores.length },
            "Exported admin stores successfully",
        );

        return stores;
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "exportAdminStores", correlationId, durationMs },
            "Failed to export admin stores",
            error,
        );
        throw new Error("Gagal mengekspor data toko");
    }
}

// ─── Import toko dengan kolom Cabang per baris ────────────────────────────────

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
        (h) => !fileHeaders.some((fh) => fh.trim() === h),
    );
    if (missing.length > 0) {
        return {
            rows: [],
            error: `Header tidak valid. Kolom yang hilang: ${missing.join(", ")}. Pastikan menggunakan template yang benar.`,
        };
    }

    return { rows };
}

export async function adminImportStoresWithBranch(formData: FormData) {
    const startTime = Date.now();
    const result = {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        errors: [] as string[],
    };

    try {
        const admin = await requireRole("ADMIN");
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
            "Nama Toko",
            "Cabang",
        ]);
        if (error) return { ...result, errors: [error] };

        result.total = rows.length;

        // Pre-fetch existing codes
        const codesInFile = [
            ...new Set(
                rows
                    .map((r) => r["Kode Toko"]?.trim().toUpperCase())
                    .filter((c): c is string => Boolean(c)),
            ),
        ];
        const existing = new Set(
            (
                await prisma.store.findMany({
                    where: { code: { in: codesInFile } },
                    select: { code: true },
                })
            ).map((s) => s.code),
        );

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const code = row["Kode Toko"]?.trim().toUpperCase();
            const name = row["Nama Toko"]?.trim();
            const branchName = row["Cabang"]?.trim();

            if (!code || !name || !branchName) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(
                        `Baris ${rowNum}: Kode Toko, Nama Toko, atau Cabang kosong`,
                    );
                }
                continue;
            }

            try {
                const isExisting = existing.has(code);
                await prisma.store.upsert({
                    where: { code },
                    update: { name, branchName, isActive: true },
                    create: { code, name, branchName, isActive: true },
                });
                if (isExisting) {
                    result.updated++;
                } else {
                    result.created++;
                    existing.add(code);
                }
            } catch {
                result.failed++;
                if (result.errors.length < MAX_IMPORT_ERRORS) {
                    result.errors.push(`Baris ${rowNum} (${code}): Gagal diproses`);
                }
            }
        }

        result.success = true;
        revalidatePath("/dashboard/stores");
        revalidatePath("/admin/database");

        logger.info(
            {
                operation: "adminImportStoresWithBranch",
                userId: admin.NIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                duration: Date.now() - startTime,
            },
            "Admin bulk store import (with branch col) completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "adminImportStoresWithBranch" },
            "Failed to import stores with branch",
            error,
        );
        return {
            ...result,
            errors: [...result.errors, "Gagal melakukan import"],
        };
    }
}
