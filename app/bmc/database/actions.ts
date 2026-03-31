"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { requireRole, validateCSRF } from "@/lib/authorization";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

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
            !existingUser.branchNames.some((b) =>
                user.branchNames.includes(b),
            )
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
            !existingUser.branchNames.some((b) =>
                user.branchNames.includes(b),
            )
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

        await prisma.store.create({ data: payload });

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

        await prisma.store.update({ where: { code }, data: payload });

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
    const startTime = Date.now();
    try {
        const user = await requireRole("BMC");
        const headersList = await headers();
        await validateCSRF(headersList);

        const existing = await prisma.store.findUnique({
            where: { code },
            select: { branchName: true },
        });
        if (!existing) return { error: "Toko tidak ditemukan" };
        if (!user.branchNames.includes(existing.branchName)) {
            return { error: "Toko ini bukan dari cabang Anda" };
        }

        await prisma.store.delete({ where: { code } });

        revalidatePath("/bmc/database");
        logger.info(
            {
                operation: "deleteStore",
                storeCode: code,
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "Store deleted",
        );
        return { success: true };
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
