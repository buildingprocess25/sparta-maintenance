// lib/presence.ts

// Declare a global map to hold active users across hot-reloads in development
const globalForPresence = globalThis as unknown as {
    activeUsers: Map<string, number> | undefined;
};

// Initialize the map if it doesn't exist
export const activeUsers = globalForPresence.activeUsers ?? new Map<string, number>();

if (process.env.NODE_ENV !== "production") {
    globalForPresence.activeUsers = activeUsers;
}

/**
 * Updates the last seen timestamp for a user.
 */
export function markUserOnline(userId: string) {
    activeUsers.set(userId, Date.now());
}

/**
 * Checks if a specific user is currently considered online.
 */
export function isUserOnline(userId: string): boolean {
    const lastSeen = activeUsers.get(userId);
    if (!lastSeen) return false;
    
    // 5 minutes interval + 1 minute grace period = 6 minutes threshold
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000;
    return (Date.now() - lastSeen) < OFFLINE_THRESHOLD_MS;
}

/**
 * Retrieves a list of all currently online user IDs.
 * Also performs lazy cleanup of stale entries.
 */
export function getOnlineUsers(): string[] {
    const onlineUsers: string[] = [];
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000;
    
    for (const [userId, lastSeen] of activeUsers.entries()) {
        if (now - lastSeen < OFFLINE_THRESHOLD_MS) {
            onlineUsers.push(userId);
        } else {
            // Lazy cleanup: remove stale entries to free up memory
            activeUsers.delete(userId);
        }
    }
    
    return onlineUsers;
}
