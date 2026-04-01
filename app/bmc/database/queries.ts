"use server";

import "server-only";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

type PaginationInput = {
    page?: number;
    limit?: number;
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
    input?: PaginationInput,
) {
    const { page, limit, skip } = resolvePagination(input);

    const where = {
        role: { in: [UserRole.BMS, UserRole.BRANCH_ADMIN] },
        branchNames: { hasSome: branchNames },
    };

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
    input?: PaginationInput,
) {
    const { page, limit, skip } = resolvePagination(input);

    const where = {
        branchName: { in: branchNames },
    };

    const [stores, total] = await Promise.all([
        prisma.store.findMany({
            where,
            select: {
                code: true,
                name: true,
                branchName: true,
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
