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

    const getSubscription = useCallback(async () => {
        const registration = await getServiceWorkerRegistration();
        if (!registration) return null;
        return registration.pushManager.getSubscription();
    }, []);

    const refresh = useCallback(async () => {
        if (!isWebPushSupported()) {
            setState("unsupported");
            return;
        }

        if (Notification.permission === "denied") {
            setState("denied");
            return;
        }

        const subscription = await getSubscription();
        if (!subscription) {
            setState(Notification.permission === "granted" ? "granted" : "default");
            return;
        }

        const response = await fetch("/api/push/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const data = (await response.json()) as { active?: boolean };
        setState(data.active ? "active" : "granted");
    }, [getSubscription]);

    const subscribe = useCallback(async () => {
        if (!isWebPushSupported()) {
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
                setState("denied");
                return;
            }

            const registration = await getServiceWorkerRegistration();
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!registration || !publicKey) {
                setState("unsupported");
                return;
            }

            const existing = await registration.pushManager.getSubscription();
            const subscription =
                existing ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                }));

            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            });

            setState("active");
        } catch {
            setState("error");
        } finally {
            setIsBusy(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { state, isBusy, refresh, subscribe };
}
