"use server";

import "server-only";
import prisma from "@/lib/prisma";

/**
 * Fetch users with BMS or BRANCH_ADMIN role whose branches overlap
 * the given branchNames.
 */
export async function getUsersByBranches(branchNames: string[]) {
    return prisma.user.findMany({
        where: {
            role: { in: ["BMS", "BRANCH_ADMIN"] },
            branchNames: { hasSome: branchNames },
        },
        select: {
            NIK: true,
            name: true,
            email: true,
            role: true,
            branchNames: true,
        },
        orderBy: { name: "asc" },
    });
}

/**
 * Fetch stores whose branchName is in the given branchNames.
 */
export async function getStoresByBranches(branchNames: string[]) {
    return prisma.store.findMany({
        where: {
            branchName: { in: branchNames },
        },
        select: {
            code: true,
            name: true,
            branchName: true,
        },
        orderBy: { name: "asc" },
    });
}
