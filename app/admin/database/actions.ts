"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import {
    type AuthUser,
    requireRole,
    validateCSRF,
} from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { z } from "zod";

// ─── Error helper ─────────────────────────────────────────────────────────────

const MASTER_DATA_ROLES = ["ADMIN", "BMC"] as const;

function isGlobalAdmin(user: AuthUser) {
    return user.role === "ADMIN";
}

async function requireMasterDataManager() {
    return requireRole([...MASTER_DATA_ROLES]);
}

function getScopedBranches(user: AuthUser) {
    return user.branchNames
        .map((branchName) => branchName.trim())
        .filter((branchName) => branchName.length > 0);
}

function isBranchInScope(user: AuthUser, branchName: string) {
    if (isGlobalAdmin(user)) return true;
    return getScopedBranches(user).includes(branchName.trim());
}

function areBranchesInScope(user: AuthUser, branchNames: string[]) {
    if (isGlobalAdmin(user)) return true;

    const scopedBranches = new Set(getScopedBranches(user));
    const normalizedBranches = branchNames
        .map((branchName) => branchName.trim())
        .filter((branchName) => branchName.length > 0);

    return (
        normalizedBranches.length > 0 &&
        normalizedBranches.every((branchName) => scopedBranches.has(branchName))
    );
}

function normalizeBranchNames(branchNames: string[]) {
    return branchNames
        .map((branchName) => branchName.trim())
        .filter((branchName) => branchName.length > 0);
}

function revalidateMasterDataPaths() {
    revalidatePath("/admin/database");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/stores");
}

function getAdminErrorDetail(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const rawTarget = (error.meta as { target?: unknown } | undefined)
                ?.target;
            const targetFields = Array.isArray(rawTarget)
                ? rawTarget.filter(
                      (field): field is string => typeof field === "string",
                  )
                : typeof rawTarget === "string"
                  ? [rawTarget]
                  : [];

            if (targetFields.includes("NIK")) return "NIK sudah terdaftar";
            if (targetFields.includes("email"))
                return "Email sudah digunakan oleh user lain";
            if (targetFields.includes("code"))
                return "Kode toko sudah terdaftar";
            return "Data sudah ada (duplikasi)";
        }
        if (error.code === "P2003" || error.code === "P2014")
            return "Data masih dipakai oleh data lain sehingga tidak bisa dihapus";
        if (error.code === "P2025")
            return "Data tidak ditemukan atau sudah diubah pengguna lain";
    }
    return getErrorDetail(error);
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

const ALL_ROLES = [
    "BMS",
    "BMC",
    "BNM_MANAGER",
    "BRANCH_ADMIN",
    "ADMIN",
] as const;

type AllowedRole = (typeof ALL_ROLES)[number];

type AdminUserPayload = {
    NIK: string;
    email: string;
    name: string;
    role: AllowedRole;
    branchNames: string[];
    areaNames?: string[];
};

export async function adminCreateUser(payload: AdminUserPayload) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!(ALL_ROLES as readonly string[]).includes(payload.role)) {
            return { error: "Role tidak valid" };
        }

        const branchNames = normalizeBranchNames(payload.branchNames);
        const areaNames = payload.areaNames ? normalizeBranchNames(payload.areaNames) : [];

        if (!isGlobalAdmin(admin)) {
            if (payload.role !== "BMS" && payload.role !== "BRANCH_ADMIN") {
                return { error: `Role ${payload.role} hanya dapat dibuat oleh ADMIN` };
            }
        }

        if (!areBranchesInScope(admin, branchNames)) {
            return {
                error: "Cabang user berada di luar scope akses Anda",
            };
        }

        const existingDeletedUser = await prisma.user.findUnique({
            where: { NIK: payload.NIK },
            select: { deletedAt: true, branchNames: true, role: true },
        });

        if (existingDeletedUser) {
            if (!existingDeletedUser.deletedAt) {
                return { error: "NIK sudah terdaftar" };
            }

            if (
                !isGlobalAdmin(admin) &&
                !areBranchesInScope(admin, existingDeletedUser.branchNames)
            ) {
                return { error: "User berada di luar scope akses Anda" };
            }

            await prisma.user.update({
                where: { NIK: payload.NIK },
                data: {
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                    branchNames,
                    areaNames,
                    deletedAt: null,
                    deletedByNIK: null,
                    mustChangePassword: true,
                    passwordHash: null,
                },
            });
        } else {
            await prisma.user.create({
                data: {
                    NIK: payload.NIK,
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                    branchNames,
                    areaNames,
                },
            });
        }

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminCreateUser",
                targetNIK: payload.NIK,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin created user",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminCreateUser", targetNIK: payload.NIK },
            "Failed to create user",
            error,
        );
        return {
            error: "Gagal membuat user",
            detail: getAdminErrorDetail(error),
        };
    }
}

export async function adminUpdateUser(
    NIK: string,
    payload: Omit<AdminUserPayload, "NIK">,
) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!(ALL_ROLES as readonly string[]).includes(payload.role)) {
            return { error: "Role tidak valid" };
        }

        const existing = await prisma.user.findUnique({
            where: { NIK },
            select: { role: true, branchNames: true, deletedAt: true },
        });
        if (!existing) return { error: "User tidak ditemukan" };
        if (existing.deletedAt) return { error: "User sudah dihapus" };

        const branchNames = normalizeBranchNames(payload.branchNames);
        const areaNames = payload.areaNames ? normalizeBranchNames(payload.areaNames) : [];

        if (!isGlobalAdmin(admin)) {
            if (existing.role === "BMC" || existing.role === "BNM_MANAGER" || existing.role === "ADMIN") {
                return { error: `Anda tidak memiliki akses untuk mengubah user dengan role ${existing.role}` };
            }
            if (payload.role !== "BMS" && payload.role !== "BRANCH_ADMIN") {
                return { error: `Role ${payload.role} hanya dapat diatur oleh ADMIN` };
            }
            if (!areBranchesInScope(admin, existing.branchNames) || !areBranchesInScope(admin, branchNames)) {
                return { error: "User berada di luar scope akses Anda" };
            }
        }

        await prisma.user.update({
            where: { NIK },
            data: {
                email: payload.email,
                name: payload.name,
                role: payload.role,
                branchNames,
                areaNames,
            },
        });

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminUpdateUser",
                targetNIK: NIK,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin updated user",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminUpdateUser", targetNIK: NIK },
            "Failed to update user",
            error,
        );
        return {
            error: "Gagal mengupdate user",
            detail: getAdminErrorDetail(error),
        };
    }
}

const ACTIVE_REPORT_STATUSES = [
    "PENDING_ESTIMATION",
    "ESTIMATION_REJECTED_REVISION",
    "ESTIMATION_APPROVED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "APPROVED_BMC",
    "REVIEW_REJECTED_REVISION",
] as const;

export async function adminGetUserActiveReports(NIK: string): Promise<
    { count: number; reportNumbers: string[] } | { error: string }
> {
    try {
        await requireMasterDataManager();

        const reports = await prisma.report.findMany({
            where: {
                createdByNIK: NIK,
                status: { in: [...ACTIVE_REPORT_STATUSES] },
            },
            select: { reportNumber: true },
        });

        return {
            count: reports.length,
            reportNumbers: reports.map((r) => r.reportNumber),
        };
    } catch {
        return { error: "Gagal mengecek laporan aktif" };
    }
}

export async function adminDeleteUser(NIK: string) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const existing = await prisma.user.findUnique({
            where: { NIK },
            select: {
                role: true,
                name: true,
                branchNames: true,
                deletedAt: true,
            },
        });
        if (!existing) return { error: "User tidak ditemukan" };
        if (existing.deletedAt) return { error: "User sudah dihapus" };

        // Prevent self-deletion
        if (NIK === admin.NIK) {
            return { error: "Anda tidak bisa menghapus akun sendiri" };
        }

        if (!isGlobalAdmin(admin)) {
            if (existing.role === "BMC" || existing.role === "BNM_MANAGER" || existing.role === "ADMIN") {
                return { error: `Anda tidak memiliki akses untuk menghapus user dengan role ${existing.role}` };
            }
            if (!areBranchesInScope(admin, existing.branchNames)) {
                return { error: "User berada di luar scope akses Anda" };
            }
        }

        await prisma.$transaction([
            prisma.userPresence.deleteMany({ where: { userId: NIK } }),
            prisma.user.update({
                where: { NIK },
                data: {
                    deletedAt: new Date(),
                    deletedByNIK: admin.NIK,
                    passwordHash: null,
                    mustChangePassword: true,
                },
            }),
        ]);

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminDeleteUser",
                targetNIK: NIK,
                targetRole: existing.role,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin deleted user",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminDeleteUser", targetNIK: NIK },
            "Failed to delete user",
            error,
        );
        return {
            error: "Gagal menghapus user",
            detail: getAdminErrorDetail(error),
        };
    }
}

// ─── Store CRUD ───────────────────────────────────────────────────────────────

type AdminStorePayload = {
    code: string;
    name: string;
    branchName: string;
    isActive?: boolean;
    areaName?: string | null;
    brand?: string | null;
};

export async function adminCreateStore(payload: AdminStorePayload) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const storeCodeSchema = z.string().regex(/^[A-Za-z0-9]{4}$/);
        if (!storeCodeSchema.safeParse(payload.code).success) {
            return { error: "Kode toko harus tepat 4 karakter huruf atau angka" };
        }

        const branchName = payload.branchName.trim();
        if (!isBranchInScope(admin, branchName)) {
            return { error: "Cabang toko berada di luar scope akses Anda" };
        }

        await prisma.store.create({
            data: {
                code: payload.code,
                name: payload.name,
                branchName,
                isActive: payload.isActive ?? true,
                areaName: payload.areaName,
                brand: payload.brand,
            },
        });

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminCreateStore",
                storeCode: payload.code,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin created store",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminCreateStore", storeCode: payload.code },
            "Failed to create store",
            error,
        );
        return {
            error: "Gagal membuat toko",
            detail: getAdminErrorDetail(error),
        };
    }
}

export async function adminUpdateStore(
    code: string,
    payload: Omit<AdminStorePayload, "code">,
) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const existing = await prisma.store.findUnique({ where: { code } });
        if (!existing) return { error: "Toko tidak ditemukan" };

        const branchName = payload.branchName.trim();
        if (
            !isGlobalAdmin(admin) &&
            (!isBranchInScope(admin, existing.branchName) ||
                !isBranchInScope(admin, branchName))
        ) {
            return { error: "Toko berada di luar scope akses Anda" };
        }

        await prisma.store.update({
            where: { code },
            data: {
                name: payload.name,
                branchName,
                isActive: payload.isActive ?? true,
                areaName: payload.areaName,
                brand: payload.brand,
            },
        });

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminUpdateStore",
                storeCode: code,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin updated store",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminUpdateStore", storeCode: code },
            "Failed to update store",
            error,
        );
        return {
            error: "Gagal mengupdate toko",
            detail: getAdminErrorDetail(error),
        };
    }
}

export async function adminDeleteStore(code: string) {
    const startTime = Date.now();
    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const existing = await prisma.store.findUnique({ where: { code } });
        if (!existing) return { error: "Toko tidak ditemukan" };

        if (!isBranchInScope(admin, existing.branchName)) {
            return { error: "Toko berada di luar scope akses Anda" };
        }

        // Cannot delete stores that have reports attached
        const reportCount = await prisma.report.count({
            where: { storeCode: code },
        });
        if (reportCount > 0) {
            return {
                error: `Toko ini memiliki ${reportCount} laporan dan tidak bisa dihapus. Nonaktifkan saja.`,
            };
        }

        await prisma.store.delete({ where: { code } });

        revalidateMasterDataPaths();
        logger.info(
            {
                operation: "adminDeleteStore",
                storeCode: code,
                userId: admin.NIK,
                duration: Date.now() - startTime,
            },
            "Admin deleted store",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "adminDeleteStore", storeCode: code },
            "Failed to delete store",
            error,
        );
        return {
            error: "Gagal menghapus toko",
            detail: getAdminErrorDetail(error),
        };
    }
}

// ─── Bulk Import (re-used from BMC, scoped to ADMIN) ─────────────────────────

export type ImportResult = {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    total: number;
    errors: string[];
};

const MAX_IMPORT_ERRORS_REPORTED = 50;

function parseXlsxFromBuffer(
    buffer: ArrayBuffer,
    expectedHeaders: string[],
): { rows: Record<string, string>[]; error?: string } {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { rows: [], error: "File XLSX kosong (tidak ada sheet)" };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
    });

    if (jsonData.length === 0) {
        return { rows: [], error: "File XLSX tidak memiliki data" };
    }

    const fileHeaders = Object.keys(jsonData[0]);
    const missingHeaders = expectedHeaders.filter(
        (h) => !fileHeaders.some((fh) => fh.trim() === h),
    );

    if (missingHeaders.length > 0) {
        return {
            rows: [],
            error: `Header tidak valid. Kolom yang hilang: ${missingHeaders.join(", ")}. Pastikan menggunakan template yang benar.`,
        };
    }

    return { rows: jsonData };
}

export async function adminImportStores(formData: FormData) {
    const startTime = Date.now();
    const result: ImportResult = {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        errors: [],
    };

    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const file = formData.get("file") as File | null;
        const targetBranch = formData.get("branchName") as string | null;

        if (!file || !(file instanceof File)) {
            return { ...result, errors: ["File tidak ditemukan"] };
        }

        if (!file.name.endsWith(".xlsx")) {
            return {
                ...result,
                errors: ["Format file tidak valid. Hanya menerima file .xlsx"],
            };
        }

        const branchName = targetBranch?.trim();
        if (!branchName) {
            return {
                ...result,
                errors: ["Branch harus dipilih untuk import toko"],
            };
        }

        if (!isBranchInScope(admin, branchName)) {
            return {
                ...result,
                errors: ["Branch berada di luar scope akses Anda"],
            };
        }

        const buffer = await file.arrayBuffer();
        const { rows, error } = parseXlsxFromBuffer(buffer, [
            "Kode Toko",
            "Nama Toko",
        ]);

        if (error) {
            return { ...result, errors: [error] };
        }

        result.total = rows.length;
        const codesInFile = Array.from(
            new Set(
                rows
                    .map((row) => row["Kode Toko"]?.trim().toUpperCase())
                    .filter(
                        (code): code is string =>
                            typeof code === "string" && code.length > 0,
                    ),
            ),
        );

        const existingStores = new Map(
            (
                await prisma.store.findMany({
                    where: { code: { in: codesInFile } },
                    select: { code: true, branchName: true },
                })
            ).map((store) => [store.code, store]),
        );

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const code = row["Kode Toko"]?.trim().toUpperCase();
            const name = row["Nama Toko"]?.trim();

            if (!code || !name) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum}: Kode Toko atau Nama Toko kosong`,
                    );
                }
                continue;
            }

            try {
                const existingStore = existingStores.get(code);
                if (
                    existingStore &&
                    !isBranchInScope(admin, existingStore.branchName)
                ) {
                    result.skipped++;
                    if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                        result.errors.push(
                            `Baris ${rowNum} (${code}): Toko berada di luar scope akses Anda`,
                        );
                    }
                    continue;
                }

                const isExisting = Boolean(existingStore);

                await prisma.store.upsert({
                    where: { code },
                    update: { name, branchName, isActive: true },
                    create: { code, name, branchName, isActive: true },
                });

                if (isExisting) {
                    result.updated++;
                } else {
                    result.created++;
                    existingStores.set(code, { code, branchName });
                }
            } catch (error) {
                result.failed++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum} (${code}): ${getAdminErrorDetail(error)}`,
                    );
                }
            }
        }

        result.success = true;
        revalidateMasterDataPaths();

        logger.info(
            {
                operation: "adminImportStores",
                userId: admin.NIK,
                branchName,
                total: result.total,
                created: result.created,
                updated: result.updated,
                duration: Date.now() - startTime,
            },
            "Admin bulk store import completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "adminImportStores" },
            "Failed to import stores",
            error,
        );
        return {
            ...result,
            errors: [
                ...result.errors,
                "Gagal melakukan import: " + getAdminErrorDetail(error),
            ],
        };
    }
}

export async function adminImportUsers(formData: FormData) {
    const startTime = Date.now();
    const result: ImportResult = {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        errors: [],
    };

    try {
        const admin = await requireMasterDataManager();
        const headersList = await headers();
        await validateCSRF(headersList);

        const file = formData.get("file") as File | null;

        if (!file || !(file instanceof File)) {
            return { ...result, errors: ["File tidak ditemukan"] };
        }

        if (!file.name.endsWith(".xlsx")) {
            return {
                ...result,
                errors: ["Format file tidak valid. Hanya menerima file .xlsx"],
            };
        }

        const buffer = await file.arrayBuffer();
        const { rows, error } = parseXlsxFromBuffer(buffer, [
            "NIK",
            "Nama",
            "Email",
            "Role",
            "Branch",
        ]);

        if (error) {
            return { ...result, errors: [error] };
        }

        result.total = rows.length;
        const validRoles = [
            "BMS",
            "BMC",
            "BNM_MANAGER",
            "BRANCH_ADMIN",
            "ADMIN",
        ];

        const niksInFile = Array.from(
            new Set(
                rows
                    .map((row) => row["NIK"]?.trim())
                    .filter(
                        (nik): nik is string =>
                            typeof nik === "string" && nik.length > 0,
                    ),
            ),
        );

        const existingUsers = new Map(
            (
                await prisma.user.findMany({
                    where: { NIK: { in: niksInFile } },
                    select: {
                        NIK: true,
                        role: true,
                        branchNames: true,
                        deletedAt: true,
                    },
                })
            ).map((user) => [user.NIK, user]),
        );

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const nik = row["NIK"]?.trim();
            const name = row["Nama"]?.trim();
            const email = row["Email"]?.trim().replace(/['";]+/g, "").trim();
            const role = row["Role"]?.trim().toUpperCase();
            const branchRaw = row["Branch"]?.trim();
            const branchNames = branchRaw
                ? branchRaw
                      .split(",")
                      .map((b) => b.trim())
                      .filter(Boolean)
                : [];

            if (!nik || !name || !email) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum}: NIK, Nama, atau Email kosong`,
                    );
                }
                continue;
            }

            if (!validRoles.includes(role)) {
                result.skipped++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum} (${nik}): Role tidak valid "${role}"`,
                    );
                }
                continue;
            }

            if (!isGlobalAdmin(admin)) {
                if (role !== "BMS" && role !== "BRANCH_ADMIN") {
                    result.skipped++;
                    if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                        result.errors.push(
                            `Baris ${rowNum} (${nik}): Anda tidak memiliki akses untuk membuat atau mengubah user dengan role "${role}"`,
                        );
                    }
                    continue;
                }
                if (!areBranchesInScope(admin, branchNames)) {
                    result.skipped++;
                    if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                        result.errors.push(
                            `Baris ${rowNum} (${nik}): User berada di luar scope akses Anda`,
                        );
                    }
                    continue;
                }
            }

            try {
                const existingUser = existingUsers.get(nik);
                if (existingUser?.deletedAt) {
                    result.skipped++;
                    if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                        result.errors.push(
                            `Baris ${rowNum} (${nik}): User sudah dihapus dan tidak bisa diupdate melalui import`,
                        );
                    }
                    continue;
                }

                if (existingUser && !isGlobalAdmin(admin)) {
                    if (existingUser.role === "BMC" || existingUser.role === "BNM_MANAGER" || existingUser.role === "ADMIN") {
                        result.skipped++;
                        if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                            result.errors.push(
                                `Baris ${rowNum} (${nik}): Anda tidak memiliki akses untuk mengubah user dengan role "${existingUser.role}"`,
                            );
                        }
                        continue;
                    }
                    if (!areBranchesInScope(admin, existingUser.branchNames)) {
                        result.skipped++;
                        if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                            result.errors.push(
                                `Baris ${rowNum} (${nik}): User existing berada di luar scope akses Anda`,
                            );
                        }
                        continue;
                    }
                }

                const isExisting = Boolean(existingUser);

                await prisma.user.upsert({
                    where: { NIK: nik },
                    update: {
                        email,
                        name,
                        role: role as AllowedRole,
                        branchNames,
                    },
                    create: {
                        NIK: nik,
                        email,
                        name,
                        role: role as AllowedRole,
                        branchNames,
                    },
                });

                if (isExisting) {
                    result.updated++;
                } else {
                    result.created++;
                    existingUsers.set(nik, {
                        NIK: nik,
                        role: role as AllowedRole,
                        branchNames,
                        deletedAt: null,
                    });
                }
            } catch (error) {
                result.failed++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum} (${nik}): ${getAdminErrorDetail(error)}`,
                    );
                }
            }
        }

        result.success = true;
        revalidateMasterDataPaths();

        logger.info(
            {
                operation: "adminImportUsers",
                userId: admin.NIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                duration: Date.now() - startTime,
            },
            "Admin bulk user import completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "adminImportUsers" },
            "Failed to import users",
            error,
        );
        return {
            ...result,
            errors: [
                ...result.errors,
                "Gagal melakukan import: " + getAdminErrorDetail(error),
            ],
        };
    }
}
