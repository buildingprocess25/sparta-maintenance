"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application Error:", error);
    }, [error]);

    // Deteksi apakah error terkait koneksi/jaringan
    const isNetworkError =
        error.message?.includes("terhubung ke server") ||
        error.message?.includes("koneksi") ||
        error.message?.includes("network") ||
        error.message?.includes("connect");

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        {isNetworkError ? (
                            <WifiOff className="h-8 w-8 text-destructive" />
                        ) : (
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        )}
                    </div>
                    <CardTitle className="text-xl">
                        {isNetworkError
                            ? "Koneksi Bermasalah"
                            : "Terjadi Kesalahan"}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {isNetworkError
                            ? "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda dan coba lagi."
                            : "Terjadi kesalahan yang tidak terduga. Silakan coba lagi."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button onClick={reset} className="w-full" size="lg">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Coba Lagi
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={() => (window.location.href = "/")}
                    >
                        Kembali ke Beranda
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
