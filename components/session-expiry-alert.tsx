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

// Halaman publik yang tidak perlu cek sesi
const PUBLIC_PATHS = [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/user-manual",
    "/maintenance",
];

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

        // Lakukan pengecekan aktif hanya setelah 8 jam sejak komponen dimuat
        // (Server-side Next.js sudah memastikan user valid saat request awal, 
        // sehingga klien cukup menjalankan timer timeout saja)
        const eightHoursMs = 8 * 60 * 60 * 1000;
        const initialTimeout = setTimeout(checkSession, eightHoursMs);

        return () => {
            clearTimeout(initialTimeout);
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
