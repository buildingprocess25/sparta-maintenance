"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

// Halaman publik yang tidak perlu cek sesi
const PUBLIC_PATHS = ["/", "/login", "/user-manual"];

export function SessionExpiryAlert() {
    const [isExpired, setIsExpired] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const isPublicPage = PUBLIC_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + "/"),
    );

    const checkSession = useCallback(async () => {
        if (isPublicPage) return;

        try {
            const res = await fetch("/api/auth/session");
            const data = await res.json();
            if (data.expired) {
                setIsExpired(true);
            }
        } catch {
            // Network error — skip
        }
    }, [isPublicPage]);

    useEffect(() => {
        if (isPublicPage) return;

        // Cek pertama kali setelah 5 detik (beri waktu page load)
        const initialTimeout = setTimeout(checkSession, 5000);

        // Cek setiap 60 detik
        const interval = setInterval(checkSession, 60 * 1000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [checkSession, isPublicPage]);

    const handleOk = () => {
        setIsExpired(false);
        router.push("/login");
    };

    if (isPublicPage) return null;

    return (
        <AlertDialog open={isExpired}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
                        <LogOut className="h-6 w-6 text-destructive" />
                    </div>
                    <AlertDialogTitle className="text-center">
                        Sesi Anda Telah Berakhir
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Silakan login kembali untuk melanjutkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction onClick={handleOk} className="w-full">
                        OK
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
