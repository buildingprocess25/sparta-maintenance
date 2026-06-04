"use server";

import prisma from "@/lib/prisma";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getAuthUser } from "@/lib/authorization";
import { logger } from "@/lib/logger";
import { getTodayPresenceStart, ONLINE_THRESHOLD_MS } from "@/lib/presence";
import type { Prisma, UserRole } from "@prisma/client";

export type AdminOnlineUserFilters = {
    search?: string;
    branchName?: string;
    role?: string;
    scope?: "today" | "online";
};

export type AdminOnlineUserRow = {
    NIK: string;
    name: string;
    email: string;
    role: UserRole;
    branchNames: string[];
    lastSeen: Date;
    isOnline: boolean;
};

export type AdminOnlineUsersResult = {
    users: AdminOnlineUserRow[];
    totalCount: number;
    onlineCount: number;
    activeTodayCount: number;
    nextCursor: string | null;
};

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

function getPresenceCutoff(scope: AdminOnlineUserFilters["scope"]) {
    if (scope === "online") {
        return new Date(Date.now() - ONLINE_THRESHOLD_MS);
    }

    return getTodayPresenceStart();
}

function buildOnlineUserWhere(
    filters: AdminOnlineUserFilters,
    scope: AdminOnlineUserFilters["scope"] = filters.scope ?? "today",
): Prisma.UserPresenceWhereInput {
    const cutoff = getPresenceCutoff(scope);
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
        lastSeen: scope === "online" ? { gt: cutoff } : { gte: cutoff },
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
    const scope = filters.scope ?? "today";
    const where = buildOnlineUserWhere(filters, scope);
    const onlineWhere = buildOnlineUserWhere(filters, "online");
    const todayWhere = buildOnlineUserWhere(filters, "today");
    const onlineCutoff = getPresenceCutoff("online");

    try {
        const [totalCount, onlineCount, activeTodayCount, rows] =
            await Promise.all([
                prisma.userPresence.count({ where }),
                prisma.userPresence.count({ where: onlineWhere }),
                prisma.userPresence.count({ where: todayWhere }),
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
                isOnline: row.lastSeen > onlineCutoff,
            })),
            totalCount,
            onlineCount,
            activeTodayCount,
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
        throw new Error("Gagal memuat aktivitas user");
    }
}
