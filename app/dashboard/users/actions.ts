"use server";

import prisma from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";

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
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    try {
        const where: Prisma.UserWhereInput = {
            // Always exclude ADMIN role from this view
            role: { not: UserRole.ADMIN },
        };

        if (filters.search) {
            where.AND = [
                { role: { not: UserRole.ADMIN } },
                {
                    OR: [
                        { name: { contains: filters.search, mode: "insensitive" } },
                        { NIK: { contains: filters.search, mode: "insensitive" } },
                        { email: { contains: filters.search, mode: "insensitive" } },
                    ],
                },
            ];
            // Remove top-level role filter since AND handles it
            delete where.role;
        }

        if (filters.role && filters.role !== "all") {
            const roleFilter: Prisma.UserWhereInput = {
                role: filters.role as UserRole,
            };
            if (where.AND) {
                (where.AND as Prisma.UserWhereInput[]).push(roleFilter);
            } else {
                where.role = filters.role as UserRole;
            }
        }

        if (filters.branchName && filters.branchName !== "all") {
            const branchFilter: Prisma.UserWhereInput = {
                branchNames: { has: filters.branchName },
            };
            if (where.AND) {
                (where.AND as Prisma.UserWhereInput[]).push(branchFilter);
            } else {
                where.branchNames = { has: filters.branchName };
            }
        }

        const totalCount = await prisma.user.count({ where });

        const users = await prisma.user.findMany({
            where,
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { NIK: cursor } : undefined,
            orderBy: { name: "asc" },
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
    if (!authUser || authUser.role !== "ADMIN") throw new Error("Unauthorized");

    try {
        const andClauses: Prisma.UserWhereInput[] = [
            { role: { not: UserRole.ADMIN } },
        ];

        if (filters.role && filters.role !== "all") {
            andClauses.push({ role: filters.role as UserRole });
        }

        if (filters.selectedBranches && filters.selectedBranches.length > 0) {
            andClauses.push({
                OR: filters.selectedBranches.map((b) => ({
                    branchNames: { has: b },
                })),
            });
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
