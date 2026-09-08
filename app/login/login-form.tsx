"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    InputGroup,
    InputGroupInput,
    InputGroupButton,
    InputGroupAddon,
} from "@/components/ui/input-group";
import { ButtonGroup } from "@/components/ui/button-group";
import Link from "next/link";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { loginAction, type LoginState } from "./action";

const initialState: LoginState = {
    errors: {},
};

function getResetMessage(resetStatus?: string): {
    tone: "success" | "error";
    text: string;
} | null {
    if (!resetStatus) return null;

    if (resetStatus === "success") {
        return {
            tone: "success",
            text: "Reset password berhasil. Silakan login menggunakan email dan nama cabang seperti login pertama.",
        };
    }

    if (resetStatus === "expired") {
        return {
            tone: "error",
            text: "Link reset password sudah kedaluwarsa. Silakan minta link baru.",
        };
    }

    if (resetStatus === "invalid") {
        return {
            tone: "error",
            text: "Link reset password tidak valid.",
        };
    }

    return null;
}

export function LoginForm({
    callbackUrl,
    resetStatus,
}: {
    callbackUrl?: string;
    resetStatus?: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [state, formAction, isPending] = useActionState(
        loginAction,
        initialState,
    );
    const resetMessage = getResetMessage(resetStatus);

    // Inline form errors handle display — no duplicate toast needed

    // Handle password input
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    // Handle email input
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    return (
        <>
            <LoadingOverlay isOpen={isPending} message="Memproses login..." />

            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg ring-0 shadow-[0_0_0_0]">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl md:text-4xl font-bold">
                            Login
                        </CardTitle>
                        <CardDescription className="text-sm md:text-lg">
                            Masukkan kredensial Anda untuk mengakses sistem
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            {resetMessage && (
                                <div
                                    className={
                                        resetMessage.tone === "success"
                                            ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"
                                            : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
                                    }
                                >
                                    {resetMessage.text}
                                </div>
                            )}

                            <div className="py-4">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const fallbackUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5173' : 'https://sparta-alfamart.web.id';
                                        window.location.href = process.env.NEXT_PUBLIC_SSO_PORTAL_URL || fallbackUrl;
                                    }}
                                    className="w-full h-12 text-base font-bold bg-[#005a9e] hover:bg-[#004a80] transition-transform active:scale-[0.98] shadow-md"
                                >
                                    Masuk via SPARTA SSO
                                </Button>
                            </div>

                            {/* Divider */}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                        Butuh bantuan?
                                    </span>
                                </div>
                            </div>

                            {/* User Manual Link */}
                            <Button
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <Link prefetch={false} href="/user-manual">
                                    Lihat User Manual
                                </Link>
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
