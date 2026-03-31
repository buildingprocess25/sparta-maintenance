"use server";

import prisma from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { getErrorDetail } from "@/lib/server-error";
import { redirect } from "next/navigation";

export type ChangePasswordState = {
    errors?: {
        newPassword?: string[];
        confirmPassword?: string[];
        form?: string[];
    };
    success?: boolean;
};

export async function changePasswordAction(
    prevState: ChangePasswordState,
    formData: FormData,
): Promise<ChangePasswordState> {
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const startTime = Date.now();

    // 1. Validasi Input
    const errors: ChangePasswordState["errors"] = {};
    if (!newPassword) errors.newPassword = ["Password baru harus diisi"];
    if (!confirmPassword)
        errors.confirmPassword = ["Konfirmasi password harus diisi"];

    if (newPassword && newPassword.length < 6) {
        errors.newPassword = ["Password minimal 6 karakter"];
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        errors.confirmPassword = ["Konfirmasi password tidak cocok"];
    }

    if (errors && Object.keys(errors).length > 0) {
        return { errors };
    }

    try {
        // 2. Ambil session — user sudah terautentikasi
        const session = await getSession();
        if (!session?.userId) {
            redirect("/login");
        }

        // 3. Ambil user dari DB
        const user = await prisma.user.findUnique({
            where: { NIK: session.userId },
            select: {
                NIK: true,
                role: true,
                mustChangePassword: true,
            },
        });

        if (!user) {
            redirect("/login?logout=1");
        }

        // 4. Hash password baru & update
        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { NIK: user.NIK },
            data: {
                passwordHash: hashedPassword,
                mustChangePassword: false,
            },
        });

        // 5. Re-create session tanpa flag mustChangePassword
        await createSession(user.NIK, user.role, false);

        logger.info(
            {
                operation: "changePassword",
                userId: user.NIK,
                duration: Date.now() - startTime,
            },
            "Password changed successfully",
        );
    } catch (error) {
        // redirect() throws NEXT_REDIRECT — rethrow it
        if (
            error instanceof Error &&
            error.message === "NEXT_REDIRECT"
        ) {
            throw error;
        }
        logger.error(
            { operation: "changePassword" },
            "Failed to change password",
            error,
        );
        return {
            errors: {
                form: [getErrorDetail(error)],
            },
        };
    }

    // Redirect setelah berhasil (diluar try-catch karena redirect throws)
    redirect("/dashboard");
}
