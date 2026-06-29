"use client";

import { useCallback, useEffect, useState } from "react";
import {
    getServiceWorkerRegistration,
    isWebPushSupported,
    urlBase64ToUint8Array,
} from "@/lib/web-push/client";

export type PushPermissionState =
    | "checking"
    | "unsupported"
    | "default"
    | "granted"
    | "denied"
    | "active"
    | "error";

export function usePushSubscription() {
    const [state, setState] = useState<PushPermissionState>("checking");
    const [isBusy, setIsBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const setError = useCallback((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Gagal mengaktifkan notifikasi.");
        setState("error");
    }, []);

    const markBrowserPushUnsupported = useCallback((error: unknown) => {
        const message =
            error instanceof Error
                ? error.message
                : "Browser tidak mendukung push subscription.";
        setErrorMessage(message);
        setState("unsupported");
    }, []);

    const getSubscription = useCallback(async () => {
        const registration = await getServiceWorkerRegistration();
        if (!registration) return null;
        return registration.pushManager.getSubscription();
    }, []);

    const refresh = useCallback(async () => {
        if (!isWebPushSupported()) {
            setErrorMessage(null);
            setState("unsupported");
            return;
        }

        if (Notification.permission === "denied") {
            setErrorMessage(null);
            setState("denied");
            return;
        }

        const subscription = await getSubscription();
        if (!subscription) {
            setErrorMessage(null);
            setState(Notification.permission === "granted" ? "granted" : "default");
            return;
        }

        try {
            const response = await fetch("/api/push/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            if (!response.ok) {
                throw new Error(`Status notifikasi gagal (${response.status})`);
            }
            const data = (await response.json()) as { active?: boolean };
            setErrorMessage(null);
            setState(data.active ? "active" : "granted");
        } catch (error) {
            setError(error);
        }
    }, [getSubscription, setError]);

    const subscribe = useCallback(async () => {
        if (!isWebPushSupported()) {
            setErrorMessage(null);
            setState("unsupported");
            return;
        }

        setIsBusy(true);
        try {
            const permission =
                Notification.permission === "default"
                    ? await Notification.requestPermission()
                    : Notification.permission;

            if (permission === "denied") {
                setErrorMessage(null);
                setState("denied");
                return;
            }
            if (permission !== "granted") {
                setErrorMessage(null);
                setState("default");
                return;
            }

            const registration = await getServiceWorkerRegistration();
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!registration || !publicKey) {
                setErrorMessage(null);
                setState("unsupported");
                return;
            }

            const existing = await registration.pushManager.getSubscription();
            let subscription = existing;

            if (!subscription) {
                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey),
                    });
                } catch (error) {
                    markBrowserPushUnsupported(error);
                    return;
                }
            }

            const p256dh = subscription.getKey("p256dh");
            const auth = subscription.getKey("auth");
            if (!p256dh || !auth) {
                throw new Error("Browser tidak memberi key push subscription.");
            }

            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
                        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
                    },
                }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as
                    | { error?: string }
                    | null;
                throw new Error(
                    data?.error ?? `Simpan perangkat gagal (${response.status})`,
                );
            }

            setErrorMessage(null);
            setState("active");
        } catch (error) {
            setError(error);
        } finally {
            setIsBusy(false);
        }
    }, [markBrowserPushUnsupported, setError]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { state, isBusy, errorMessage, refresh, subscribe };
}
