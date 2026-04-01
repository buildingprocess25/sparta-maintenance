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

                            {callbackUrl && (
                                <input
                                    type="hidden"
                                    name="callbackUrl"
                                    value={callbackUrl}
                                />
                            )}
                            {/* Email */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Email
                                </label>
                                <InputGroup>
                                    <InputGroupInput
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Masukkan email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        required
                                        disabled={isPending}
                                    />
                                    <InputGroupAddon align="inline-start">
                                        <Mail className="h-4 w-4" />
                                    </InputGroupAddon>
                                </InputGroup>
                                {state.errors?.email && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.email[0]}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Password
                                </label>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <Lock className="h-4 w-4" />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        required
                                        disabled={isPending}
                                    />
                                    <InputGroupButton
                                        size="icon-sm"
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </InputGroupButton>
                                </InputGroup>
                                {state.errors?.password && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.password[0]}
                                    </p>
                                )}
                            </div>

                            {/* Form-level error (server error, invalid credentials) */}
                            {state.errors?.form && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                    {state.errors.form[0]}
                                </div>
                            )}

                            {/* Forgot Password — coming soon */}
                            <div className="flex justify-end">
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-primary hover:underline"
                                >
                                    Lupa Password?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <ButtonGroup className="w-full">
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    size="lg"
                                    disabled={isPending}
                                >
                                    {isPending ? "Memproses..." : "Login"}
                                </Button>
                            </ButtonGroup>

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
                                <Link href="/user-manual">
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
