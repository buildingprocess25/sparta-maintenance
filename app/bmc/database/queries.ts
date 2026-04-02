"use server";

import "server-only";
import prisma from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

type PaginationInput = {
    page?: number;
    limit?: number;
};

export type UserFilterInput = PaginationInput & {
    search?: string;
    role?: string;
};

export type StoreFilterInput = PaginationInput & {
    search?: string;
    status?: string;
};

function resolvePagination(input?: PaginationInput) {
    const page = Math.max(DEFAULT_PAGE, input?.page ?? DEFAULT_PAGE);
    const limit = Math.max(1, input?.limit ?? DEFAULT_LIMIT);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

/**
 * Fetch users with BMS or BRANCH_ADMIN role whose branches overlap
 * the given branchNames.
 */
export async function getUsersByBranches(
    branchNames: string[],
    input?: UserFilterInput,
) {
    const { page, limit, skip } = resolvePagination(input);

    const where: Prisma.UserWhereInput = {
        branchNames: { hasSome: branchNames },
    };

    if (input?.role && input.role !== "all") {
        where.role = input.role as UserRole;
    } else {
        where.role = { in: [UserRole.BMS, UserRole.BRANCH_ADMIN] };
    }

    if (input?.search) {
        where.OR = [
            { name: { contains: input.search, mode: "insensitive" } },
            { NIK: { contains: input.search, mode: "insensitive" } },
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
 * Fetch stores whose branchName is in the given branchNames.
 */
export async function getStoresByBranches(
    branchNames: string[],
    input?: StoreFilterInput,
) {
    const { page, limit, skip } = resolvePagination(input);

    const where: Prisma.StoreWhereInput = {
        branchName: { in: branchNames },
    };

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
            orderBy: { name: "asc" },
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
