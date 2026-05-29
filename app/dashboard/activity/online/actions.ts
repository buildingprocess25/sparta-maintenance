"use server";

import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import type { Prisma, UserRole } from "@prisma/client";

export type AdminOnlineUserFilters = {
    search?: string;
    branchName?: string;
    role?: string;
};

export type AdminOnlineUserRow = {
    NIK: string;
    name: string;
    email: string;
    role: UserRole;
    branchNames: string[];
    lastSeen: Date;
};

export type AdminOnlineUsersResult = {
    users: AdminOnlineUserRow[];
    totalCount: number;
    nextCursor: string | null;
};

const ONLINE_THRESHOLD_MS = 6 * 60 * 1000;

async function requireAdmin() {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }
    return user;
}

function normalizeFilterValue(value?: string) {
    if (!value || value === "all") return undefined;
    return value;
}

function buildOnlineUserWhere(
    filters: AdminOnlineUserFilters,
): Prisma.UserPresenceWhereInput {
    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);
    const search = filters.search?.trim();
    const branchName = normalizeFilterValue(filters.branchName);
    const role = normalizeFilterValue(filters.role);

    const userAnd: Prisma.UserWhereInput[] = [
        { NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } } },
    ];

    if (search) {
        userAnd.push({
            OR: [
                { NIK: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { branchNames: { has: search } },
            ],
        });
    }

    if (branchName) {
        userAnd.push({ branchNames: { has: branchName } });
    }

    if (role) {
        userAnd.push({ role: role as UserRole });
    }

    return {
        lastSeen: { gt: cutoff },
        user: { AND: userAnd },
    };
}

export async function getAdminOnlineUsers(
    cursor: string | null,
    limit = 20,
    filters: AdminOnlineUserFilters = {},
): Promise<AdminOnlineUsersResult> {
    await requireAdmin();

    const correlationId = crypto.randomUUID();
    const start = performance.now();
    const where = buildOnlineUserWhere(filters);

    try {
        const [totalCount, rows] = await Promise.all([
            prisma.userPresence.count({ where }),
            prisma.userPresence.findMany({
                where,
                take: limit + 1,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { userId: cursor } : undefined,
                orderBy: [{ lastSeen: "desc" }, { userId: "asc" }],
                select: {
                    lastSeen: true,
                    user: {
                        select: {
                            NIK: true,
                            name: true,
                            email: true,
                            role: true,
                            branchNames: true,
                        },
                    },
                },
            }),
        ]);

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const next = rows.pop();
            nextCursor = next?.user.NIK ?? null;
        }

        logger.info(
            {
                operation: "getAdminOnlineUsers",
                correlationId,
                durationMs: Math.round(performance.now() - start),
                count: rows.length,
            },
            "Fetched admin online users",
        );

        return {
            users: rows.map((row) => ({
                ...row.user,
                lastSeen: row.lastSeen,
            })),
            totalCount,
            nextCursor,
        };
    } catch (error) {
        logger.error(
            {
                operation: "getAdminOnlineUsers",
                correlationId,
                durationMs: Math.round(performance.now() - start),
            },
            "Failed to fetch admin online users",
            error,
        );
        throw new Error("Gagal memuat user online");
    }
}
