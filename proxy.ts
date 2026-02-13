import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "bnm_session";

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/user-manual"];

// Route prefixes that require authentication
const protectedPrefixes = ["/dashboard", "/reports", "/approval", "/admin"];

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if route is protected
    const isProtectedRoute = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
    const isLoginRoute = pathname === "/login";

    // Read and parse session cookie (optimistic check — no DB call)
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let isAuthenticated = false;

    if (sessionCookie) {
        try {
            const session = JSON.parse(sessionCookie);
            if (session.userId && new Date(session.expiresAt) > new Date()) {
                isAuthenticated = true;
            }
        } catch {
            // Invalid cookie — treat as unauthenticated
        }
    }

    // Redirect unauthenticated users away from protected routes
    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from login page
    if (isLoginRoute && isAuthenticated) {
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|_next/mcp|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)",
    ],
};
