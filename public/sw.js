const CACHE_VERSION = "spartam-pwa-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll([OFFLINE_URL])),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_VERSION)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;
    if (requestUrl.pathname.startsWith("/api")) return;
    if (requestUrl.pathname.startsWith("/_next")) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const cloned = response.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                    cache.put(event.request, cloned);
                });
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(event.request);
                if (cached) return cached;
                return caches.match(OFFLINE_URL);
            }),
    );
});

self.addEventListener("push", (event) => {
    let payload = {
        title: "SPARTA Maintenance",
        body: "Ada notifikasi baru.",
        href: "/dashboard",
        notificationId: null,
        type: null,
    };

    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: {
            href: payload.href || "/dashboard",
            notificationId: payload.notificationId,
            type: payload.type,
        },
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const href = event.notification.data?.href || "/dashboard";
    const targetUrl = new URL(href, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                const existing = clients.find((client) => client.url === targetUrl);
                if (existing) return existing.focus();
                return self.clients.openWindow(targetUrl);
            }),
    );
});
