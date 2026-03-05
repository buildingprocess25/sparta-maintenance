"use client";

import { useState } from "react";
import { useTransition } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LogOut, AlertTriangle } from "lucide-react";
import { logoutAction } from "./action";

export function LogoutButton() {
    const [isPending, startTransition] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleLogout = () => {
        setIsDialogOpen(false);
        startTransition(async () => {
            await logoutAction();
        });
    };

    return (
        <>
            <LoadingOverlay isOpen={isPending} message="Logging out..." />

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <button
                        disabled={isPending}
                        className="cursor-pointer group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/8 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                    >
                        <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        <span className="hidden sm:inline">Keluar</span>
                    </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Konfirmasi Logout
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin keluar dari sistem? Anda
                            perlu login kembali untuk mengakses halaman ini.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Ya, Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
