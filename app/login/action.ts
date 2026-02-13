"use server";

import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
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

    try {
        // 2. Cari User berdasarkan Email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return {
                errors: {
                    form: ["Email atau password salah."],
                },
            };
        }

        // 3. Validasi Password
        // Password harus sama dengan branchName (uppercase, case-insensitive)
        const isPasswordValid =
            user.branchName &&
            user.branchName.trim().toUpperCase() ===
                password.trim().toUpperCase();

        if (!isPasswordValid) {
            return {
                errors: {
                    form: ["Email atau password salah."],
                },
            };
        }

        // 4. Buat Sesi Login
        await createSession(user.id, user.role);
    } catch (error) {
        console.error("Login Error:", error);
        return {
            errors: {
                form: ["Terjadi kesalahan pada server. Silakan coba lagi."],
            },
        };
    }

    // 5. Redirect jika sukses (Dilakukan di luar try-catch karena redirect melempar error NEXT_REDIRECT)
    redirect("/dashboard");
}
