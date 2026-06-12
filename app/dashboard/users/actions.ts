"use server";

import prisma from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";

export type AdminUserFilters = {
    search?: string;
    role?: string;       // single role value — "all" = no filter
    branchName?: string; // single branch — "all" = no filter
};

// ─── List (cursor-based infinite scroll) ─────────────────────────────────────

export async function getAdminUsers(
    cursor: string | null,
    limit: number = 20,
    filters: AdminUserFilters,
) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "BMC")) {
        throw new Error("Unauthorized");
    }

    try {
        const andClauses: Prisma.UserWhereInput[] = [{ deletedAt: null }];

        if (user.role === "ADMIN") {
            andClauses.push({
                NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
            });
        } else {
            andClauses.push({ role: { not: UserRole.ADMIN } });

            const branchNames = user.branchNames
                .map((branchName) => branchName.trim())
                .filter((branchName) => branchName.length > 0);

            if (branchNames.length === 0) {
                andClauses.push({ NIK: "__NO_BRANCH_SCOPE__" });
            } else {
                andClauses.push({ branchNames: { hasSome: branchNames } });
            }
        }

        if (filters.search) {
            andClauses.push({
                OR: [
                    {
                        name: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        NIK: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                ],
            });
        }

        if (filters.role && filters.role !== "all") {
            andClauses.push({ role: filters.role as UserRole });
        }

        if (filters.branchName && filters.branchName !== "all") {
            if (
                user.role !== "ADMIN" &&
                !user.branchNames.includes(filters.branchName)
            ) {
                andClauses.push({ NIK: "__NO_BRANCH_SCOPE__" });
            }
            andClauses.push({ branchNames: { has: filters.branchName } });
        }

        const where: Prisma.UserWhereInput = { AND: andClauses };

        const totalCount = await prisma.user.count({ where });

        const users = await prisma.user.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { NIK: cursor } : undefined,
            orderBy: [{ name: "asc" }, { NIK: "asc" }],
            select: {
                NIK: true,
                name: true,
                email: true,
                role: true,
                branchNames: true,
            },
        });

        let nextCursor: string | null = null;
        if (users.length > limit) {
            const next = users.pop();
            nextCursor = next!.NIK;
        }

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "getAdminUsers", correlationId, durationMs, count: users.length },
            "Fetched admin users successfully",
        );

        return { users, nextCursor, totalCount };
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "getAdminUsers", correlationId, durationMs },
            "Failed to fetch admin users",
            error,
        );
        throw new Error("Gagal memuat data user");
    }
}

// ─── Export (fetch all for XLSX generation) ───────────────────────────────────

export type ExportUserFilters = {
    selectedBranches?: string[]; // [] = all branches
    role?: string;               // undefined or "all" = all roles
};

export async function exportAdminUsers(filters: ExportUserFilters) {
    const correlationId = crypto.randomUUID();
    const start = performance.now();

    const authUser = await getAuthUser();
    if (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "BMC")) {
        throw new Error("Unauthorized");
    }

    try {
        const andClauses: Prisma.UserWhereInput[] = [{ deletedAt: null }];

        const scopedBranches = authUser.branchNames
            .map((branchName) => branchName.trim())
            .filter((branchName) => branchName.length > 0);

        if (authUser.role === "ADMIN") {
            andClauses.push({
                NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } },
            });
        } else if (scopedBranches.length === 0) {
            andClauses.push({ role: { not: UserRole.ADMIN } });
            andClauses.push({ NIK: "__NO_BRANCH_SCOPE__" });
        } else {
            andClauses.push({ role: { not: UserRole.ADMIN } });
            andClauses.push({ branchNames: { hasSome: scopedBranches } });
        }

        if (filters.role && filters.role !== "all") {
            andClauses.push({ role: filters.role as UserRole });
        }

        if (filters.selectedBranches && filters.selectedBranches.length > 0) {
            const selectedBranches =
                authUser.role === "ADMIN"
                    ? filters.selectedBranches
                    : filters.selectedBranches.filter((branchName) =>
                          scopedBranches.includes(branchName),
                      );

            if (selectedBranches.length === 0) {
                andClauses.push({ NIK: "__NO_BRANCH_SCOPE__" });
            } else {
                andClauses.push({
                    OR: selectedBranches.map((b) => ({
                        branchNames: { has: b },
                    })),
                });
            }
        }

        const users = await prisma.user.findMany({
            where: { AND: andClauses },
            orderBy: [{ branchNames: "asc" }, { name: "asc" }],
            select: {
                NIK: true,
                name: true,
                email: true,
                role: true,
                branchNames: true,
            },
        });

        const durationMs = Math.round(performance.now() - start);
        logger.info(
            { operation: "exportAdminUsers", correlationId, durationMs, count: users.length },
            "Exported admin users successfully",
        );

        return users;
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        logger.error(
            { operation: "exportAdminUsers", correlationId, durationMs },
            "Failed to export admin users",
            error,
        );
        throw new Error("Gagal mengekspor data user");
    }
}
