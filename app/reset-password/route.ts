import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyPasswordResetToken } from "@/lib/password-reset-token";

function getRuntimeEnv(name: string): string | undefined {
    return process.env[name];
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

function buildAppBaseUrl(request: NextRequest): string {
    const nodeEnv = getRuntimeEnv("NODE_ENV");
    const allowLocalhost = nodeEnv !== "production";

    const configuredBaseUrl =
        normalizeBaseUrl(getRuntimeEnv("APP_BASE_URL"), {
            allowLocalhost,
        }) ??
        normalizeBaseUrl(getRuntimeEnv("RENDER_EXTERNAL_URL"), {
            allowLocalhost,
        }) ??
        normalizeBaseUrl(getRuntimeEnv("NEXT_PUBLIC_APP_URL"), {
            allowLocalhost,
        });

    if (configuredBaseUrl) return configuredBaseUrl;

    const forwardedHost =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto =
        request.headers.get("x-forwarded-proto") ??
        (nodeEnv === "production" ? "https" : "http");

    if (forwardedHost) {
        const fromForwarded = normalizeBaseUrl(
            `${forwardedProto}://${forwardedHost}`,
            {
                allowLocalhost,
            },
        );
        if (fromForwarded) return fromForwarded;
    }

    const fromRequestOrigin = normalizeBaseUrl(request.nextUrl.origin, {
        allowLocalhost,
    });
    if (fromRequestOrigin) return fromRequestOrigin;

    logger.warn(
        {
            operation: "resetPasswordByEmail",
            nodeEnv,
            appBaseUrl: getRuntimeEnv("APP_BASE_URL") ?? null,
            renderExternalUrl: getRuntimeEnv("RENDER_EXTERNAL_URL") ?? null,
            nextPublicAppUrl: getRuntimeEnv("NEXT_PUBLIC_APP_URL") ?? null,
            requestUrlOrigin: request.nextUrl.origin,
            forwardedHost: request.headers.get("x-forwarded-host") ?? null,
            host: request.headers.get("host") ?? null,
        },
        "Reset-password redirect fallback to localhost:3000",
    );

    return "http://localhost:3000";
}

function loginRedirect(request: NextRequest, status: string) {
    const baseUrl = buildAppBaseUrl(request);
    const url = new URL(
        `/login?reset=${encodeURIComponent(status)}`,
        baseUrl,
    );
    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
        return loginRedirect(request, "invalid");
    }

    try {
        const payload = await verifyPasswordResetToken(token);

        const user = await prisma.user.findUnique({
            where: { NIK: payload.sub },
            select: { NIK: true, email: true },
        });

        if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
            return loginRedirect(request, "invalid");
        }

        await prisma.user.update({
            where: { NIK: user.NIK },
            data: {
                passwordHash: null,
                mustChangePassword: true,
            },
        });

        logger.info(
            {
                operation: "resetPasswordByEmail",
                userId: user.NIK,
                email: user.email,
            },
            "Password reset link used successfully",
        );

        return loginRedirect(request, "success");
    } catch (error) {
        logger.warn(
            {
                operation: "resetPasswordByEmail",
                errorMessage:
                    error instanceof Error ? error.message : String(error),
            },
            "Password reset link invalid or expired",
        );
        return loginRedirect(request, "expired");
    }
}
