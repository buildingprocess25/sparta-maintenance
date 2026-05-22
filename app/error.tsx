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

    const isDevelopment = process.env.NODE_ENV === "development";
    const rawMessage = error.message ?? "";
    const normalizedMessage = rawMessage.toLowerCase();

    // Deteksi apakah error terkait koneksi/jaringan
    const isNetworkError =
        normalizedMessage.includes("terhubung ke server") ||
        normalizedMessage.includes("koneksi") ||
        normalizedMessage.includes("network") ||
        normalizedMessage.includes("connect");

    const isServerActionMismatch =
        rawMessage.includes("Failed to find Server Action") ||
        rawMessage.includes("older or newer deployment");

    function handleRetry() {
        if (isServerActionMismatch) {
            window.location.reload();
            return;
        }

        reset();
    }

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
                            : isServerActionMismatch
                              ? "Pembaruan Sistem Terdeteksi"
                              : "Terjadi Kesalahan"}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {isNetworkError
                            ? "Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda dan coba lagi."
                            : isServerActionMismatch
                              ? "Ada update sistem terbaru. Silakan refresh browser untuk melanjutkan."
                              : "Terjadi kesalahan yang tidak terduga. Silakan coba lagi."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isDevelopment && rawMessage && !isNetworkError && (
                        <div className="rounded-md bg-muted p-3 text-left">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                Detail error (laporkan ke developer):
                            </p>
                            <p className="text-sm text-foreground wrap-break-word font-mono">
                                {rawMessage}
                            </p>
                        </div>
                    )}
                    {error.digest && (
                        <p className="text-xs text-muted-foreground">
                            ID Referensi Error: {error.digest}
                        </p>
                    )}
                    <Button onClick={handleRetry} className="w-full" size="lg">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isServerActionMismatch ? "Refresh Browser" : "Coba Lagi"}
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
