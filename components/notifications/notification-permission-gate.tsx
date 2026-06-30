"use client";

import { useEffect, useState } from "react";
import { BellRing, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "./use-push-subscription";

const REQUIRED_ROLES = new Set(["BMS", "BMC", "BNM_MANAGER", "ADMIN"]);

export function NotificationPermissionGate({ role }: { role: string }) {
    const [dismissed, setDismissed] = useState(false);
    const { state, isBusy, errorMessage, refresh, subscribe } =
        usePushSubscription();

    const enabled =
        process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED !== "false" &&
        process.env.NEXT_PUBLIC_WEB_PUSH_ENABLED !== "false" &&
        process.env.NEXT_PUBLIC_NOTIFICATION_GATE_REQUIRED === "true";

    useEffect(() => {
        if (enabled && REQUIRED_ROLES.has(role) && state === "granted" && !isBusy) {
            subscribe();
        }
    }, [enabled, isBusy, role, state, subscribe]);

    if (!enabled || dismissed || !REQUIRED_ROLES.has(role)) return null;

    if (state === "checking" || state === "unsupported" || state === "active") {
        return null;
    }

    const denied = state === "denied";
    const error = state === "error";

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg">
                <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                    <BellRing className="size-4" />
                    <AlertTitle>Aktifkan notifikasi untuk melanjutkan</AlertTitle>
                    <AlertDescription>
                        {error
                            ? `Izin browser sudah dicek, tetapi perangkat belum berhasil terhubung ke server notifikasi. ${errorMessage ?? "Coba aktifkan ulang."}`
                            : "SPARTA memakai notifikasi untuk approval laporan, revisi, dan PJUM. Anda wajib mengaktifkan notifikasi agar tidak melewatkan proses bisnis."}
                    </AlertDescription>
                </Alert>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {denied ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={refresh}
                            disabled={isBusy}
                        >
                            <RefreshCw data-icon="inline-start" />
                            Cek ulang izin
                        </Button>
                    ) : (
                        <Button type="button" onClick={subscribe} disabled={isBusy}>
                            <BellRing data-icon="inline-start" />
                            {isBusy ? "Mengaktifkan..." : "Aktifkan notifikasi"}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDismissed(true)}
                    >
                        <X data-icon="inline-start" />
                        Tutup
                    </Button>
                </div>
                {denied ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Izin notifikasi sedang diblokir oleh browser. Aktifkan izin
                        dari pengaturan browser/site settings, lalu klik Cek ulang izin.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
