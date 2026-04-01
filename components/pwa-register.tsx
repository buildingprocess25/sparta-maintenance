"use client";

import { useEffect } from "react";

export function PWARegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        const register = async () => {
            try {
                await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                    updateViaCache: "none",
                });
            } catch {
                // Do not break app UX if service worker registration fails.
            }
        };

        register();
    }, []);

    return null;
}
