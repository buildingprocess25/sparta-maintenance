export function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isWebPushSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    );
}

export async function getServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) return null;

    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;

    return navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
    });
}
