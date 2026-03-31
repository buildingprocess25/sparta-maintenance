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
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import {
    changePasswordAction,
    type ChangePasswordState,
} from "./action";

const initialState: ChangePasswordState = {
    errors: {},
};

export function ChangePasswordForm() {
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [state, formAction, isPending] = useActionState(
        changePasswordAction,
        initialState,
    );

    return (
        <>
            <LoadingOverlay
                isOpen={isPending}
                message="Mengubah password..."
            />

            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg ring-0 shadow-[0_0_0_0]">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-2">
                            <div className="rounded-full bg-primary/10 p-3">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold">
                            Buat Password Baru
                        </CardTitle>
                        <CardDescription className="text-sm md:text-base">
                            Demi keamanan akun, silakan buat password baru untuk
                            menggantikan password default.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="newPassword"
                                    className="text-sm font-medium leading-none"
                                >
                                    Password Baru
                                </label>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <Lock className="h-4 w-4" />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id="newPassword"
                                        name="newPassword"
                                        type={
                                            showNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Minimal 6 karakter"
                                        minLength={6}
                                        required
                                        disabled={isPending}
                                    />
                                    <InputGroupButton
                                        size="icon-sm"
                                        type="button"
                                        onClick={() =>
                                            setShowNewPassword(!showNewPassword)
                                        }
                                        aria-label={
                                            showNewPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </InputGroupButton>
                                </InputGroup>
                                {state.errors?.newPassword && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.newPassword[0]}
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="text-sm font-medium leading-none"
                                >
                                    Konfirmasi Password Baru
                                </label>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        <Lock className="h-4 w-4" />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Ulangi password baru"
                                        minLength={6}
                                        required
                                        disabled={isPending}
                                    />
                                    <InputGroupButton
                                        size="icon-sm"
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword,
                                            )
                                        }
                                        aria-label={
                                            showConfirmPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </InputGroupButton>
                                </InputGroup>
                                {state.errors?.confirmPassword && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.confirmPassword[0]}
                                    </p>
                                )}
                            </div>

                            {/* Form-level error */}
                            {state.errors?.form && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                    {state.errors.form[0]}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={isPending}
                            >
                                {isPending
                                    ? "Memproses..."
                                    : "Simpan Password Baru"}
                            </Button>

                            <p className="text-xs text-muted-foreground text-center">
                                Anda harus mengganti password default sebelum
                                melanjutkan menggunakan aplikasi.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
