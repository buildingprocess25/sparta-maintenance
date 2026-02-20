import "server-only";
import { getSession } from "./session";
import prisma from "./prisma";
import { redirect } from "next/navigation";
import { isConnectionError } from "./db-error";

export type UserRole = "BMS" | "BMC" | "ADMIN";

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    branchName: string | null;
};

/**
 * Authorization error - thrown when user doesn't have required permissions
 */
export class AuthorizationError extends Error {
    constructor(
        message: string = "Anda tidak memiliki akses untuk melakukan aksi ini",
    ) {
        super(message);
        this.name = "AuthorizationError";
    }
}

/**
 * Get current authenticated user with full details
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    const session = await getSession();
    if (!session?.userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                branchName: true,
            },
        });

        if (!user) return null;

        return user as AuthUser;
    } catch (error) {
        console.error("Error fetching auth user:", error);
        return null;
    }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getAuthUser();
    if (!user) {
        redirect("/login?logout=1");
    }
    return user;
}

/**
 * Require specific role(s) - throw AuthorizationError if user doesn't have required role
 */
export async function requireRole(
    allowedRoles: UserRole | UserRole[],
): Promise<AuthUser> {
    const user = await requireAuth();

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(user.role)) {
        throw new AuthorizationError(
            `Akses ditolak. Role yang dibutuhkan: ${roles.join(", ")}`,
        );
    }

    return user;
}

/**
 * Check if user owns a resource (e.g., report)
 */
export async function requireOwnership(
    resourceUserId: string,
    errorMessage?: string,
): Promise<AuthUser> {
    const user = await requireAuth();

    // ADMIN can access all resources
    if (user.role === "ADMIN") {
        return user;
    }

    if (user.id !== resourceUserId) {
        throw new AuthorizationError(
            errorMessage ||
                "Anda hanya bisa mengakses resource milik Anda sendiri",
        );
    }

    return user;
}

/**
 * Check if user can access reports from a specific branch
 */
export async function requireBranchAccess(
    branchName: string,
    errorMessage?: string,
): Promise<AuthUser> {
    const user = await requireAuth();

    // ADMIN can access all branches
    if (user.role === "ADMIN") {
        return user;
    }

    if (user.branchName !== branchName) {
        throw new AuthorizationError(
            errorMessage ||
                "Anda hanya bisa mengakses data dari cabang Anda sendiri",
        );
    }

    return user;
}

/**
 * Validate CSRF token via origin check
 * Call this at the start of mutating server actions
 */
export async function validateCSRF(headers: Headers): Promise<void> {
    const origin = headers.get("origin");
    const host = headers.get("host");

    // In development, allow localhost and dev tunnels
    if (process.env.NODE_ENV === "development") {
        const allowedOrigins = [
            `http://localhost:3000`,
            `https://localhost:3000`,
            host ? `http://${host}` : null,
            host ? `https://${host}` : null,
        ].filter(Boolean);

        // Also allow configured dev tunnel origins
        const devTunnelPatterns = [
            /\.devtunnels\.ms$/,
            /\.ngrok-free\.dev$/,
            /\.ngrok\.io$/,
        ];

        const isAllowedOrigin =
            origin &&
            (allowedOrigins.includes(origin) ||
                devTunnelPatterns.some((pattern) =>
                    pattern.test(new URL(origin).hostname),
                ));

        if (!isAllowedOrigin) {
            console.warn("CSRF validation failed:", { origin, host });
        }
        return; // Don't block in development
    }

    // In production, strictly validate origin matches host
    if (!origin || !host) {
        throw new Error("Missing origin or host header");
    }

    const originHost = new URL(origin).host;
    if (originHost !== host) {
        throw new Error("CSRF validation failed: origin mismatch");
    }
}

/**
 * Get current user with safe error handling (moved from auth-helper.ts)
 */
export async function getCurrentUser() {
    const session = await getSession();

    if (!session || !session.userId) {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                branchName: true,
                createdAt: true,
            },
        });

        return user;
    } catch (error) {
        // Throw connection errors agar ditangkap oleh error.tsx boundary
        if (isConnectionError(error)) {
            throw new Error(
                "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.",
            );
        }
        console.error("Error fetching user:", error);
        return null;
    }
}

/**
 * Get user statistics for dashboard (moved from auth-helper.ts)
 */
export async function getUserStats(userId: string) {
    try {
        const [totalReports, pendingReports, approvedReports, rejectedReports] =
            await Promise.all([
                prisma.report.count({
                    where: { createdById: userId },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "PENDING_APPROVAL",
                    },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "APPROVED",
                    },
                }),
                prisma.report.count({
                    where: {
                        createdById: userId,
                        status: "REJECTED",
                    },
                }),
            ]);

        return {
            totalReports,
            pendingReports,
            approvedReports,
            rejectedReports,
        };
    } catch (error) {
        console.error("Error fetching user stats:", error);
        return {
            totalReports: 0,
            pendingReports: 0,
            approvedReports: 0,
            rejectedReports: 0,
        };
    }
}
