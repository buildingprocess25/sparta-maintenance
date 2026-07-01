import "server-only";

import prisma from "@/lib/prisma";
import { getJakartaTodayStart } from "./time";

export const ONLINE_THRESHOLD_MS = 6 * 60 * 1000;

export function getTodayPresenceStart() {
    return getJakartaTodayStart();
}

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
    return Date.now() - presence.lastSeen.getTime() < ONLINE_THRESHOLD_MS;
}

/**
 * Retrieves a list of all currently online user IDs.
 * Also performs lazy cleanup of stale entries.
 */
export async function getOnlineUsers(): Promise<string[]> {
    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);

    const rows = await prisma.userPresence.findMany({
        where: { lastSeen: { gt: cutoff } },
        select: { userId: true },
    });

    return rows.map((row) => row.userId);
}

/**
 * Retrieves users who were seen at least once today.
 */
export async function getTodayActiveUsers(): Promise<string[]> {
    const rows = await prisma.userPresence.findMany({
        where: { lastSeen: { gte: getTodayPresenceStart() } },
        select: { userId: true },
    });

    return rows.map((row) => row.userId);
}
