import "server-only";

import prisma from "@/lib/prisma";

/**
 * Updates the last seen timestamp for a user.
 */
export function markUserOnline(userId: string) {
    const now = new Date();
    return prisma.userPresence.upsert({
        where: { userId },
        update: { lastSeen: now },
        create: { userId, lastSeen: now },
    });
}

/**
 * Checks if a specific user is currently considered online.
 */
export async function isUserOnline(userId: string): Promise<boolean> {
    const presence = await prisma.userPresence.findUnique({
        where: { userId },
        select: { lastSeen: true },
    });
    if (!presence) return false;

    // 5 minutes interval + 1 minute grace period = 6 minutes threshold
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000;
    return Date.now() - presence.lastSeen.getTime() < OFFLINE_THRESHOLD_MS;
}

/**
 * Retrieves a list of all currently online user IDs.
 * Also performs lazy cleanup of stale entries.
 */
export async function getOnlineUsers(): Promise<string[]> {
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000;
    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    const rows = await prisma.userPresence.findMany({
        where: { lastSeen: { gt: cutoff } },
        select: { userId: true },
    });

    return rows.map((row) => row.userId);
}
