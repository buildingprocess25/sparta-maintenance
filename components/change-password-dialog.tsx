"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    InputGroup,
    InputGroupInput,
    InputGroupButton,
    InputGroupAddon,
} from "@/components/ui/input-group";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { changePasswordAction, type ChangePasswordState } from "@/app/change-password/action";

const initialState: ChangePasswordState = { errors: {} };

export interface ChangePasswordDialogProps {
    variant?: "default" | "outline";
    menuTitle?: string;
    iconNode?: React.ReactNode;
}

export function ChangePasswordDialog({ variant = "outline", menuTitle = "Ganti Password", iconNode }: ChangePasswordDialogProps) {
    const [open, setOpen] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [state, formAction, isPending] = useActionState(
        changePasswordAction,
        initialState,
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} className="w-full justify-start gap-2 h-auto text-left py-2.5">
                    {iconNode}
                    <span className="whitespace-normal leading-snug">{menuTitle}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <div className="flex justify-center mb-2 mt-2">
                        <div className="rounded-full bg-primary/10 p-3">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-xl">Buat Password Baru</DialogTitle>
                    <DialogDescription className="text-center">
                        Demi keamanan akun, silakan buat password baru untuk menggantikan password saat ini.
                    </DialogDescription>
                </DialogHeader>

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
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Minimal 6 karakter"
                                minLength={6}
                                required
                                disabled={isPending}
                            />
                            <InputGroupButton
                                size="icon-sm"
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Ulangi password baru"
                                minLength={6}
                                required
                                disabled={isPending}
                            />
                            <InputGroupButton
                                size="icon-sm"
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

                    <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Memproses..." : "Simpan Password"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
