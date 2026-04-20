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
                if (payload.userId) {
                    isAuthenticated = true;
                    mustChangePassword = (payload.mustChangePassword as boolean) ?? false;
                    userRole = (payload.role as string) ?? "";
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
    
    const { enabled: isMaintenanceEnabled, message: maintenanceMessage } = getMaintenanceState();
    const isAdmin = userRole === "ADMIN";

    // Pengecualian Maintenance:
    // Jika tidak maintenance ATAU jika user adalah ADMIN, redirect keluar dari /maintenance
    if (isMaintenanceRoute && (!isMaintenanceEnabled || isAdmin)) {
        const response = NextResponse.redirect(new URL("/", request.url));
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
                new URL("/maintenance", request.url),
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
        const response = NextResponse.redirect(new URL("/login", request.url));
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
        const loginUrl = new URL("/login", request.url);
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
                new URL("/change-password", request.url),
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
                new URL("/change-password", request.url),
            );
            logRequest(
                request,
                "redirect",
                response.status,
                Math.round(performance.now() - start),
            );
            return response;
        }
        const dashboardUrl = new URL("/dashboard", request.url);
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
