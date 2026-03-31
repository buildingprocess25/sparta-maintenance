"use server";

import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { getDbErrorMessage } from "@/lib/db-error";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";

// State awal untuk useFormState
export type LoginState = {
    errors?: {
        email?: string[];
        password?: string[];
        form?: string[];
    };
    success?: boolean;
};

export async function loginAction(
    prevState: LoginState,
    formData: FormData,
): Promise<LoginState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 1. Validasi Input Sederhana
    const errors: LoginState["errors"] = {};
    if (!email) errors.email = ["Email harus diisi"];
    if (!password) errors.password = ["Password harus diisi"];

    if (Object.keys(errors).length > 0) {
        return { errors };
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
            return {
                errors: {
                    form: ["Email atau password salah."],
                },
            };
        }

        mustChangePassword = user.mustChangePassword;

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
    // Validate: must start with / but not // (prevents open redirect)
    const safeRedirect =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
            ? callbackUrl
            : "/dashboard";
    redirect(safeRedirect);
}
