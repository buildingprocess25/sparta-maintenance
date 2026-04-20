"use server";

import "server-only";
import prisma from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 10;

type PaginationInput = {
    page?: number;
    limit?: number;
};

/** Filter untuk semua role — ADMIN tidak terbatas branch */
export type AdminUserFilterInput = PaginationInput & {
    search?: string;
    role?: string;
    branchName?: string;
};

export type AdminStoreFilterInput = PaginationInput & {
    search?: string;
    status?: string;
    branchName?: string;
};

function resolvePagination(input?: PaginationInput) {
    const page = Math.max(1, input?.page ?? 1);
    const limit = Math.max(1, input?.limit ?? DEFAULT_LIMIT);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

/**
 * Fetch all users globally (ADMIN scope — no branch restriction).
 */
export async function getAllUsers(input?: AdminUserFilterInput) {
    const { page, limit, skip } = resolvePagination(input);

    const where: Prisma.UserWhereInput = {};

    if (input?.role && input.role !== "all") {
        where.role = input.role as UserRole;
    }

    if (input?.branchName && input.branchName !== "all") {
        where.branchNames = { has: input.branchName };
    }

    if (input?.search) {
        where.OR = [
            { name: { contains: input.search, mode: "insensitive" } },
            { NIK: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                NIK: true,
                name: true,
                email: true,
                role: true,
                branchNames: true,
            },
            orderBy: { name: "asc" },
            skip,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

/**
 * Fetch all stores globally (ADMIN scope — no branch restriction).
 */
export async function getAllStores(input?: AdminStoreFilterInput) {
    const { page, limit, skip } = resolvePagination(input);

    const where: Prisma.StoreWhereInput = {};

    if (input?.branchName && input.branchName !== "all") {
        where.branchName = input.branchName;
    }

    if (input?.search) {
        where.OR = [
            { name: { contains: input.search, mode: "insensitive" } },
            { code: { contains: input.search, mode: "insensitive" } },
        ];
    }

    if (input?.status && input.status !== "all") {
        where.isActive = input.status === "active";
    }

    const [stores, total] = await Promise.all([
        prisma.store.findMany({
            where,
            select: {
                code: true,
                name: true,
                branchName: true,
                isActive: true,
            },
            orderBy: [{ branchName: "asc" }, { name: "asc" }],
            skip,
            take: limit,
        }),
        prisma.store.count({ where }),
    ]);

    return {
        stores,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

/** Distinct branch names for filter dropdowns */
export async function getAllBranchNamesForAdmin(): Promise<string[]> {
    const result = await prisma.store.findMany({
        distinct: ["branchName"],
        select: { branchName: true },
        orderBy: { branchName: "asc" },
    });
    return result.map((r) => r.branchName);
}
