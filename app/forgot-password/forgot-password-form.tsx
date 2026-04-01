"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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
    InputGroupAddon,
} from "@/components/ui/input-group";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Mail } from "lucide-react";
import { forgotPasswordAction, type ForgotPasswordState } from "./action";

const initialState: ForgotPasswordState = {
    errors: {},
};

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [state, formAction, isPending] = useActionState(
        forgotPasswordAction,
        initialState,
    );

    return (
        <>
            <LoadingOverlay
                isOpen={isPending}
                message="Memproses permintaan reset..."
            />

            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg ring-0 shadow-[0_0_0_0]">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl md:text-4xl font-bold">
                            Lupa Password
                        </CardTitle>
                        <CardDescription className="text-sm md:text-lg">
                            Masukkan email Anda untuk menerima link reset
                            password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium leading-none"
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
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
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

                            {state.errors?.form && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                    {state.errors.form[0]}
                                </div>
                            )}

                            {state.success && state.message && (
                                <div className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700 border border-emerald-200">
                                    {state.message}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={isPending}
                            >
                                {isPending
                                    ? "Memproses..."
                                    : "Kirim Link Reset Password"}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <Link href="/login">Kembali ke Login</Link>
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
