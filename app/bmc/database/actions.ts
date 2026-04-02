"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// ─── User CRUD ───────────────────────────────────────────────

type UserPayload = {
    NIK: string;
    email: string;
    name: string;
    role: "BMS" | "BRANCH_ADMIN";
    branchNames: string[];
};

export async function createUser(payload: UserPayload) {
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        // BMC can only add users to their own branches
        const invalidBranches = payload.branchNames.filter(
            (b) => !user.branchNames.includes(b),
        );
        if (invalidBranches.length > 0) {
            return {
                error: `Anda tidak punya akses ke cabang: ${invalidBranches.join(", ")}`,
            };
        }

        // Only BMS and BRANCH_ADMIN allowed
        if (!["BMS", "BRANCH_ADMIN"].includes(payload.role)) {
            return { error: "Role tidak valid. Hanya BMS atau Branch Admin." };
        }

        await prisma.user.create({ data: payload });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "createUser",
                targetNIK: payload.NIK,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "User created",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "createUser", targetNIK: payload.NIK },
            "Failed to create user",
            error,
        );
        return {
            error: "Gagal membuat user",
            detail: getErrorDetail(error),
        };
    }
}

export async function updateUser(
    NIK: string,
    payload: Omit<UserPayload, "NIK">,
) {
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        const invalidBranches = payload.branchNames.filter(
            (b) => !user.branchNames.includes(b),
        );
        if (invalidBranches.length > 0) {
            return {
                error: `Anda tidak punya akses ke cabang: ${invalidBranches.join(", ")}`,
            };
        }

        if (!["BMS", "BRANCH_ADMIN"].includes(payload.role)) {
            return { error: "Role tidak valid. Hanya BMS atau Branch Admin." };
        }

        // Ensure target user is in BMC's branches
        const existingUser = await prisma.user.findUnique({
            where: { NIK },
            select: { branchNames: true },
        });
        if (!existingUser) return { error: "User tidak ditemukan" };
        if (
            !existingUser.branchNames.some((b) => user.branchNames.includes(b))
        ) {
            return { error: "User ini bukan dari cabang Anda" };
        }

        await prisma.user.update({ where: { NIK }, data: payload });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "updateUser",
                targetNIK: NIK,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "User updated",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "updateUser", targetNIK: NIK },
            "Failed to update user",
            error,
        );
        return {
            error: "Gagal mengupdate user",
            detail: getErrorDetail(error),
        };
    }
}

export async function deleteUser(NIK: string) {
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        const existingUser = await prisma.user.findUnique({
            where: { NIK },
            select: { branchNames: true, role: true },
        });
        if (!existingUser) return { error: "User tidak ditemukan" };
        if (!["BMS", "BRANCH_ADMIN"].includes(existingUser.role)) {
            return { error: "Tidak bisa menghapus user dengan role ini" };
        }
        if (
            !existingUser.branchNames.some((b) => user.branchNames.includes(b))
        ) {
            return { error: "User ini bukan dari cabang Anda" };
        }

        await prisma.user.delete({ where: { NIK } });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "deleteUser",
                targetNIK: NIK,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "User deleted",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "deleteUser", targetNIK: NIK },
            "Failed to delete user",
            error,
        );
        return {
            error: "Gagal menghapus user",
            detail: getErrorDetail(error),
        };
    }
}

// ─── Store CRUD ──────────────────────────────────────────────

type StorePayload = {
    code: string;
    name: string;
    branchName: string;
    isActive?: boolean;
};

export async function createStore(payload: StorePayload) {
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!user.branchNames.includes(payload.branchName)) {
            return { error: "Anda tidak punya akses ke cabang ini" };
        }

        await prisma.store.create({
            data: {
                ...payload,
                isActive: payload.isActive ?? true,
            },
        });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "createStore",
                storeCode: payload.code,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "Store created",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "createStore", storeCode: payload.code },
            "Failed to create store",
            error,
        );
        return {
            error: "Gagal membuat toko",
            detail: getErrorDetail(error),
        };
    }
}

export async function updateStore(
    code: string,
    payload: Omit<StorePayload, "code">,
) {
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        if (!user.branchNames.includes(payload.branchName)) {
            return { error: "Anda tidak punya akses ke cabang ini" };
        }

        const existing = await prisma.store.findUnique({
            where: { code },
            select: { branchName: true },
        });
        if (!existing) return { error: "Toko tidak ditemukan" };
        if (!user.branchNames.includes(existing.branchName)) {
            return { error: "Toko ini bukan dari cabang Anda" };
        }

        await prisma.store.update({
            where: { code },
            data: {
                ...payload,
                isActive: payload.isActive ?? true,
            },
        });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "updateStore",
                storeCode: code,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "Store updated",
        );
        return { success: true };
    } catch (error) {
        logger.error(
            { operation: "updateStore", storeCode: code },
            "Failed to update store",
            error,
        );
        return {
            error: "Gagal mengupdate toko",
            detail: getErrorDetail(error),
        };
    }
}

export async function deleteStore(code: string) {
    try {
        await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        return {
            error: "Toko tidak bisa dihapus. Gunakan Edit untuk menonaktifkan toko.",
        };
    } catch (error) {
        logger.error(
            { operation: "deleteStore", storeCode: code },
            "Failed to delete store",
            error,
        );
        return {
            error: "Gagal menghapus toko",
            detail: getErrorDetail(error),
        };
    }
}

// ─── Bulk Import ─────────────────────────────────────────────

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

/**
 * Parse an XLSX file from FormData and return rows as objects.
 * Validates that the file is present and has the expected headers.
 */
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

    // Validate headers exist in the first row's keys
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

export async function importStores(formData: FormData) {
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
        const user = await requireRole("BMC");
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

        // Determine target branch
        const branchName = targetBranch?.trim() || user.branchNames[0];
        if (!branchName || !user.branchNames.includes(branchName)) {
            return {
                ...result,
                errors: ["Cabang tidak valid atau Anda tidak punya akses"],
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

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
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
                const existing = await prisma.store.findUnique({
                    where: { code },
                    select: { code: true },
                });

                if (existing) {
                    await prisma.store.update({
                        where: { code },
                        data: { name, isActive: true },
                    });
                    result.updated++;
                } else {
                    await prisma.store.create({
                        data: {
                            code,
                            name,
                            branchName,
                            isActive: true,
                        },
                    });
                    result.created++;
                }
            } catch (error) {
                result.failed++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum} (${code}): ${getErrorDetail(error)}`,
                    );
                }
            }
        }

        result.success = true;
        revalidatePath("/bmc/database");

        logger.info(
            {
                operation: "importStores",
                userId: user.NIK,
                branchName,
                total: result.total,
                created: result.created,
                updated: result.updated,
                skipped: result.skipped,
                failed: result.failed,
                duration: Date.now() - startTime,
            },
            "Bulk store import completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "importStores" },
            "Failed to import stores",
            error,
        );
        return {
            ...result,
            errors: [
                ...result.errors,
                "Gagal melakukan import: " + getErrorDetail(error),
            ],
        };
    }
}

export async function importUsers(formData: FormData) {
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
        const user = await requireRole("BMC");
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
        ]);

        if (error) {
            return { ...result, errors: [error] };
        }

        result.total = rows.length;
        const validRoles = ["BMS", "BRANCH_ADMIN"];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const nik = row["NIK"]?.trim();
            const name = row["Nama"]?.trim();
            const email = row["Email"]?.trim().replace(/['"]+/g, "").trim();
            const role = row["Role"]?.trim().toUpperCase();

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
                        `Baris ${rowNum} (${nik}): Role tidak valid "${role}". Gunakan BMS atau BRANCH_ADMIN`,
                    );
                }
                continue;
            }

            try {
                const existing = await prisma.user.findUnique({
                    where: { NIK: nik },
                    select: { NIK: true },
                });

                if (existing) {
                    await prisma.user.update({
                        where: { NIK: nik },
                        data: {
                            email,
                            name,
                            role: role as "BMS" | "BRANCH_ADMIN",
                            branchNames: user.branchNames,
                        },
                    });
                    result.updated++;
                } else {
                    await prisma.user.create({
                        data: {
                            NIK: nik,
                            email,
                            name,
                            role: role as "BMS" | "BRANCH_ADMIN",
                            branchNames: user.branchNames,
                        },
                    });
                    result.created++;
                }
            } catch (error) {
                result.failed++;
                if (result.errors.length < MAX_IMPORT_ERRORS_REPORTED) {
                    result.errors.push(
                        `Baris ${rowNum} (${nik}): ${getErrorDetail(error)}`,
                    );
                }
            }
        }

        result.success = true;
        revalidatePath("/bmc/database");

        logger.info(
            {
                operation: "importUsers",
                userId: user.NIK,
                total: result.total,
                created: result.created,
                updated: result.updated,
                skipped: result.skipped,
                failed: result.failed,
                duration: Date.now() - startTime,
            },
            "Bulk user import completed",
        );

        return result;
    } catch (error) {
        logger.error(
            { operation: "importUsers" },
            "Failed to import users",
            error,
        );
        return {
            ...result,
            errors: [
                ...result.errors,
                "Gagal melakukan import: " + getErrorDetail(error),
            ],
        };
    }
}
