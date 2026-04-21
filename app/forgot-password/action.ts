"use server";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getDbErrorMessage } from "@/lib/db-error";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email/mailer";
import { buildPasswordResetHtml } from "@/lib/email/templates/password-reset";
import { createPasswordResetToken } from "@/lib/password-reset-token";

export type ForgotPasswordState = {
    errors?: {
        email?: string[];
        form?: string[];
    };
    success?: boolean;
    message?: string;
};

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeBaseUrl(
    rawUrl: string | null | undefined,
    options?: { allowLocalhost?: boolean },
): string | null {
    if (!rawUrl) return null;

    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }

        const hostname = parsed.hostname.toLowerCase();
        const isLocalHost =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "0.0.0.0" ||
            hostname === "::1" ||
            hostname === "[::1]";

        if (isLocalHost && !options?.allowLocalhost) {
            return null;
        }

        return parsed.origin;
    } catch {
        return null;
    }
}

function buildAppBaseUrl(reqHeaders: Headers): string {
    const allowLocalhost = process.env.NODE_ENV !== "production";

    const configuredBaseUrl =
        normalizeBaseUrl(process.env.APP_BASE_URL, {
            allowLocalhost,
        }) ??
        normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL, {
            allowLocalhost,
        });

    if (configuredBaseUrl) return configuredBaseUrl;

    if (process.env.NODE_ENV !== "production") {
        const origin = normalizeBaseUrl(reqHeaders.get("origin"), {
            allowLocalhost: true,
        });
        if (origin) return origin;

        const host =
            reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host");
        const proto = reqHeaders.get("x-forwarded-proto") ?? "http";

        if (host) {
            const fromHost = normalizeBaseUrl(`${proto}://${host}`, {
                allowLocalhost: true,
            });
            if (fromHost) return fromHost;
        }
    }

    return "http://localhost:3000";
}

export async function forgotPasswordAction(
    _prevState: ForgotPasswordState,
    formData: FormData,
): Promise<ForgotPasswordState> {
    const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();

    if (!email) {
        return { errors: { email: ["Email harus diisi"] } };
    }

    if (!isValidEmail(email)) {
        return { errors: { email: ["Format email tidak valid"] } };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { NIK: true, email: true, name: true },
        });

        if (user) {
            const reqHeaders = await headers();
            const baseUrl = buildAppBaseUrl(reqHeaders);
            const token = await createPasswordResetToken({
                userId: user.NIK,
                email: user.email,
            });
            const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

            await sendEmail({
                to: user.email,
                subject: "Reset Password SPARTA Maintenance",
                html: buildPasswordResetHtml({
                    userName: user.name,
                    resetUrl,
                }),
            });

            logger.info(
                {
                    operation: "forgotPassword",
                    email: user.email,
                    userId: user.NIK,
                },
                "Password reset email sent",
            );
        } else {
            logger.warn(
                { operation: "forgotPassword", email },
                "Forgot password requested for unknown email",
            );
        }

        return {
            success: true,
            message:
                "Jika email terdaftar, link reset password sudah dikirim. Silakan cek inbox Anda.",
        };
    } catch (error) {
        logger.error(
            { operation: "forgotPassword", email },
            "Failed to process forgot password request",
            error,
        );

        return {
            errors: {
                form: [getDbErrorMessage(error)],
            },
        };
    }
}
