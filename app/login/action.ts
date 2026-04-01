"use server";

import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { getDbErrorMessage } from "@/lib/db-error";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
    clearLoginFailures,
    getLoginRateLimitKey,
    isLoginBlocked,
    recordLoginFailure,
} from "@/lib/rate-limit";

// State awal untuk useFormState
export type LoginState = {
    errors?: {
        email?: string[];
        password?: string[];
        form?: string[];
    };
    success?: boolean;
};

function formatWaitTime(seconds: number): string {
    const total = Math.max(1, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    return `${minutes} menit ${remainingSeconds} detik`;
}

function getSafeRedirectPath(callbackUrl: string | null): string {
    if (!callbackUrl) return "/dashboard";

    const trimmed = callbackUrl.trim();
    if (!trimmed || trimmed.length > 512) return "/dashboard";
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return "/dashboard";
    }
    if (trimmed.includes("\\")) return "/dashboard";

    try {
        const decoded = decodeURIComponent(trimmed);
        if (decoded.startsWith("//") || decoded.includes("\\")) {
            return "/dashboard";
        }
    } catch {
        return "/dashboard";
    }

    try {
        const parsed = new URL(trimmed, "http://localhost");
        if (parsed.origin !== "http://localhost") return "/dashboard";
        if (!parsed.pathname.startsWith("/")) return "/dashboard";
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return "/dashboard";
    }
}

export async function loginAction(
    prevState: LoginState,
    formData: FormData,
): Promise<LoginState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for") ?? "";
    const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

    // 1. Validasi Input Sederhana
    const errors: LoginState["errors"] = {};
    if (!email) errors.email = ["Email harus diisi"];
    if (!password) errors.password = ["Password harus diisi"];

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    const rateLimitKey = getLoginRateLimitKey(email, ip);
    const limitState = isLoginBlocked(rateLimitKey);
    if (limitState.blocked) {
        return {
            errors: {
                form: [
                    `Terlalu banyak percobaan login. Coba lagi dalam ${formatWaitTime(limitState.retryAfterSeconds)}.`,
                ],
            },
        };
    }

    let mustChangePassword = false;

    try {
        // 2. Cari User berdasarkan Email
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                NIK: true,
                role: true,
                branchNames: true,
                passwordHash: true,
                mustChangePassword: true,
            },
        });

        if (!user) {
            recordLoginFailure(rateLimitKey);
            return {
                errors: {
                    form: ["Email atau password salah."],
                },
            };
        }

        // 3. Validasi Password — dual path
        let isPasswordValid = false;

        if (user.passwordHash) {
            // User sudah punya password hash → bcrypt verify (case-sensitive)
            isPasswordValid = await verifyPassword(password, user.passwordHash);
        } else {
            // Legacy: user belum set password → compare dengan branch name (case-insensitive)
            isPasswordValid =
                user.branchNames.length > 0 &&
                user.branchNames.some(
                    (branch) =>
                        branch.trim().toUpperCase() ===
                        password.trim().toUpperCase(),
                );
        }

        if (!isPasswordValid) {
            recordLoginFailure(rateLimitKey);
            return {
                errors: {
                    form: ["Email atau password salah."],
                },
            };
        }

        mustChangePassword = user.mustChangePassword;
        clearLoginFailures(rateLimitKey);

        // 4. Buat Sesi Login (termasuk flag mustChangePassword)
        await createSession(user.NIK, user.role, mustChangePassword);
    } catch (error) {
        logger.error({ operation: "login" }, "Login failed", error);
        const message = getDbErrorMessage(error);
        return {
            errors: {
                form: [message],
            },
        };
    }

    // 5. Redirect — jika harus ganti password, ke halaman change-password
    if (mustChangePassword) {
        redirect("/change-password");
    }

    const callbackUrl = formData.get("callbackUrl") as string | null;
    const safeRedirect = getSafeRedirectPath(callbackUrl);
    redirect(safeRedirect);
}
