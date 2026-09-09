import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";

function normalizeBaseUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl) return null;

    try {
        const parsed = new URL(rawUrl.trim());
        const hostname = parsed.hostname.toLowerCase();

        if (process.env.NODE_ENV === "production") {
            const isLocalhost =
                hostname === "localhost" ||
                hostname === "127.0.0.1" ||
                hostname === "0.0.0.0" ||
                hostname === "::1" ||
                hostname === "[::1]";

            if (isLocalhost) return null;
        }

        return parsed.origin;
    } catch {
        return null;
    }
}

function buildPublicRedirectUrl(request: NextRequest, pathname: string): URL {
    const baseUrl =
        normalizeBaseUrl(process.env.APP_BASE_URL) ??
        normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
        normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ??
        normalizeBaseUrl(request.headers.get("origin")) ??
        normalizeBaseUrl(request.nextUrl.origin);

    return new URL(pathname, baseUrl ?? "http://localhost:3000");
}
/**
 * GET /auth/sso/callback?token=<launch-token>
 *
 * SSO Callback Endpoint untuk integrasi dengan SPARTA Login Portal.
 * Dipanggil ketika user berhasil login di SPARTA Portal dan di-redirect
 * kembali ke aplikasi Maintenance.
 *
 * Alur:
 * 1. Terima launch token dari query parameter.
 * 2. Exchange token ke SPARTA API untuk mendapatkan data user.
 * 3. Cocokkan email dari response ke user lokal Maintenance.
 * 4. Buat local session jika user ditemukan.
 * 5. Redirect ke dashboard.
 *
 * Ref: docs/integration/module-sso-contract.md
 * Ref: docs/integration/sparta-maintenance-sso-checklist.md (Step 5)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token");

    // 1. Validasi: token harus ada di query parameter
    if (!token) {
        return NextResponse.redirect(
            buildPublicRedirectUrl(request, "/login?error=sso_token_missing"),
        );
    }

    const spartaApiUrl = process.env.SPARTA_API_URL;
    if (!spartaApiUrl) {
        console.error("[SSO Callback] SPARTA_API_URL is not configured.");
        return NextResponse.redirect(
            buildPublicRedirectUrl(request, "/login?error=sso_misconfigured"),
        );
    }

    // 2. Exchange launch token ke SPARTA API
    let spartaEmail: string;
    try {
        const exchangeRes = await fetch(`${spartaApiUrl}/v1/sso/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                moduleId: "maintenance",
                launchToken: token,
            }),
        });

        if (!exchangeRes.ok) {
            // Token tidak valid, sudah dipakai, expired, atau moduleId mismatch
            const errorData = await exchangeRes.json().catch(() => ({}));
            console.warn("[SSO Callback] Exchange failed:", errorData);
            return NextResponse.redirect(
                buildPublicRedirectUrl(request, "/login?error=sso_token_invalid"),
            );
        }

        const payload = await exchangeRes.json();
        spartaEmail = payload?.data?.user?.email;

        if (!spartaEmail) {
            console.error("[SSO Callback] No email in exchange response:", payload);
            return NextResponse.redirect(
                buildPublicRedirectUrl(request, "/login?error=sso_payload_invalid"),
            );
        }
    } catch (err) {
        console.error("[SSO Callback] Failed to reach SPARTA API:", err);
        return NextResponse.redirect(
            buildPublicRedirectUrl(request, "/login?error=sso_unreachable"),
        );
    }

    // 3. Cocokkan email ke user lokal Maintenance
    const user = await prisma.user.findFirst({
        where: {
            email: {
                equals: spartaEmail,
                mode: "insensitive",
            },
            deletedAt: null,
        },
        select: {
            NIK: true,
            role: true,
            mustChangePassword: true,
        },
    });

    if (!user) {
        // User tidak terdaftar di Maintenance — akses ditolak
        console.warn(
            `[SSO Callback] Email "${spartaEmail}" not found in Maintenance users.`,
        );
        return NextResponse.redirect(
            buildPublicRedirectUrl(request, "/login?error=sso_access_denied"),
        );
    }

    // 4. Buat local session menggunakan NIK, role, dan status password
    await createSession(user.NIK, user.role, user.mustChangePassword);

    // 5. Redirect ke dashboard
    return NextResponse.redirect(buildPublicRedirectUrl(request, "/dashboard"));
}
