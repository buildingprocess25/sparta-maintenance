import "server-only";

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
    // eslint-disable-next-line no-var
    var __spartaRateLimitStore: RateLimitStore | undefined;
}

const store: RateLimitStore = globalThis.__spartaRateLimitStore ?? new Map();
if (!globalThis.__spartaRateLimitStore) {
    globalThis.__spartaRateLimitStore = store;
}

const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) {
            store.delete(key);
        }
    }
}

export function getLoginRateLimitKey(email: string, ip: string): string {
    return `${email.trim().toLowerCase()}::${ip.trim() || "unknown"}`;
}

export function isLoginBlocked(key: string): {
    blocked: boolean;
    retryAfterSeconds: number;
} {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const entry = store.get(key);
    if (!entry) {
        return { blocked: false, retryAfterSeconds: 0 };
    }

    if (entry.count < LOGIN_MAX_ATTEMPTS) {
        return { blocked: false, retryAfterSeconds: 0 };
    }

    return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
}

export function recordLoginFailure(key: string): void {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
        return;
    }

    existing.count += 1;
    store.set(key, existing);
}

export function clearLoginFailures(key: string): void {
    store.delete(key);
}
