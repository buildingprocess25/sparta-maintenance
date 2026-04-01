import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyPasswordResetToken } from "@/lib/password-reset-token";

function loginRedirect(request: NextRequest, status: string) {
    const url = new URL(
        `/login?reset=${encodeURIComponent(status)}`,
        request.url,
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
