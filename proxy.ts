import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getMaintenanceState } from "@/lib/maintenance";

const SESSION_COOKIE_NAME = "app_session";

type RequestLogOutcome =
    | "next"
    | "redirect"
    | "maintenance-json"
    | "maintenance-redirect";

const REQUEST_LOG_ENABLED =
    (process.env.REQUEST_LOG_ENABLED ?? "true").trim().toLowerCase() !==
    "false";

function parseSampleRate(value: string | undefined): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 0.15;
    if (parsed <= 0) return 0;
    if (parsed >= 1) return 1;
    return parsed;
}

function parseSlowThresholdMs(value: string | undefined): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) return 1200;
    return parsed;
}

const REQUEST_LOG_SAMPLE_RATE = parseSampleRate(
    process.env.REQUEST_LOG_SAMPLE_RATE,
);
const REQUEST_LOG_SLOW_MS = parseSlowThresholdMs(
    process.env.REQUEST_LOG_SLOW_MS,
);

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

    const host =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto =
        request.headers.get("x-forwarded-proto") ??
        (nodeEnv === "production" ? "https" : "http");

    if (host) {
        const fromHost = normalizeBaseUrl(`${proto}://${host}`, {
            allowLocalhost,
        });
        if (fromHost) return fromHost;
    }

    const fromOriginHeader = normalizeBaseUrl(request.headers.get("origin"), {
        allowLocalhost,
    });
    if (fromOriginHeader) return fromOriginHeader;

    const fromRequestOrigin = normalizeBaseUrl(request.nextUrl.origin, {
        allowLocalhost,
    });
    if (fromRequestOrigin) return fromRequestOrigin;

    return "http://localhost:3000";
}

function buildRedirectUrl(request: NextRequest, pathname: string): URL {
    return new URL(pathname, buildAppBaseUrl(request));
}

// Route prefixes that require authentication
const protectedPrefixes = ["/dashboard", "/reports", "/approval", "/admin"];

// Routes allowed when user must change password (whitelist)
const changePasswordAllowList = [
    "/change-password",
    "/forgot-password",
    "/reset-password",
    "/login",
    "/api",
];

function getSecretKey() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    return new TextEncoder().encode(secret);
}

function logRequest(
    request: NextRequest,
    outcome: RequestLogOutcome,
    status: number,
    durationMs: number,
) {
    if (!REQUEST_LOG_ENABLED) return;
    if (request.nextUrl.pathname === "/api/health") return;

    const isErrorStatus = status >= 400;
    const isRedirect = status >= 300 && status < 400;
    const isSlow = durationMs >= REQUEST_LOG_SLOW_MS;
    const shouldSample = Math.random() < REQUEST_LOG_SAMPLE_RATE;

    // High-traffic strategy: always keep problematic signals, sample healthy flow.
    if (!isErrorStatus && !isRedirect && !isSlow && !shouldSample) {
        return;
    }

    const payload = {
        timestamp: new Date().toISOString(),
        level: "info",
        operation: "http.request",
        method: request.method,
        path: request.nextUrl.pathname,
        outcome,
        status,
        durationMs,
        sampled: !isErrorStatus && !isRedirect && !isSlow,
    };

    console.log(JSON.stringify(payload));
}

export default async function proxy(request: NextRequest) {
    // Cek JWT session (Optimistic)
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let isAuthenticated = false;
    let mustChangePassword = false;
    let userRole = "";

    if (sessionCookie) {
        try {
            const key = getSecretKey();
            if (key) {
                const { payload } = await jwtVerify(sessionCookie, key);
                userRole = (payload.role as string) ?? "";
                mustChangePassword =
                    (payload.mustChangePassword as boolean) ?? false;
                if (payload.userId) {
                    isAuthenticated = true;
                }
            }
        } catch {
            // Invalid or expired token — treat as unauthenticated
        }
    }

    const start = performance.now();
    const { pathname } = request.nextUrl;
    const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");
    const isHealthRoute = pathname === "/api/health";
    const isMaintenanceRoute = pathname === "/maintenance";

    const { enabled: isMaintenanceEnabled, message: maintenanceMessage } =
        getMaintenanceState();
    const isAdmin = userRole === "ADMIN";

    // Pengecualian Maintenance:
    // Jika tidak maintenance ATAU jika user adalah ADMIN, redirect keluar dari /maintenance
    if (isMaintenanceRoute && (!isMaintenanceEnabled || isAdmin)) {
        const response = NextResponse.redirect(buildRedirectUrl(request, "/"));
        logRequest(
            request,
            "redirect",
            response.status,
            Math.round(performance.now() - start),
        );
        return response;
    }

    // Jika maintenance aktif dan bukan ADMIN -> Block
    if (isMaintenanceEnabled && !isAdmin) {
        if (isApiRoute && !isHealthRoute) {
            const response = NextResponse.json(
                {
                    error: maintenanceMessage,
                    maintenance: true,
                },
                {
                    status: 503,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
            logRequest(
                request,
                "maintenance-json",
                response.status,
                Math.round(performance.now() - start),
            );
            return response;
        }

        if (!isMaintenanceRoute) {
            const response = NextResponse.redirect(
                buildRedirectUrl(request, "/maintenance"),
            );
            logRequest(
                request,
                "maintenance-redirect",
                response.status,
                Math.round(performance.now() - start),
            );
            return response;
        }
    }

    // Cek apakah route diproteksi
    const isProtectedRoute = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
    const isLoginRoute = pathname === "/login";

    // Clear session cookie FIRST — before any auth check — when user not found in DB
    if (isLoginRoute && request.nextUrl.searchParams.get("logout") === "1") {
        const response = NextResponse.redirect(
            buildRedirectUrl(request, "/login"),
        );
        response.cookies.delete(SESSION_COOKIE_NAME);
        logRequest(
            request,
            "redirect",
            response.status,
            Math.round(performance.now() - start),
        );
        return response;
    }

    // Redirect unauthenticated users away from protected routes
    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = buildRedirectUrl(request, "/login");
        const response = NextResponse.redirect(loginUrl);
        logRequest(
            request,
            "redirect",
            response.status,
            Math.round(performance.now() - start),
        );
        return response;
    }

    // Force password change: block all routes except whitelist
    if (isAuthenticated && mustChangePassword) {
        const isAllowed = changePasswordAllowList.some(
            (prefix) =>
                pathname === prefix || pathname.startsWith(prefix + "/"),
        );
        if (!isAllowed) {
            const response = NextResponse.redirect(
                buildRedirectUrl(request, "/change-password"),
            );
            logRequest(
                request,
                "redirect",
                response.status,
                Math.round(performance.now() - start),
            );
            return response;
        }
    }

    // Redirect authenticated users away from login page
    if (isLoginRoute && isAuthenticated) {
        if (mustChangePassword) {
            const response = NextResponse.redirect(
                buildRedirectUrl(request, "/change-password"),
            );
            logRequest(
                request,
                "redirect",
                response.status,
                Math.round(performance.now() - start),
            );
            return response;
        }
        const dashboardUrl = buildRedirectUrl(request, "/dashboard");
        const response = NextResponse.redirect(dashboardUrl);
        logRequest(
            request,
            "redirect",
            response.status,
            Math.round(performance.now() - start),
        );
        return response;
    }

    const response = NextResponse.next();
    logRequest(
        request,
        "next",
        response.status,
        Math.round(performance.now() - start),
    );
    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|_next/mcp|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)",
    ],
};
