"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global fetch interceptor untuk mendeteksi session expiry
 * Akan redirect ke /login jika API mengembalikan 401 Unauthorized
 */
export function SessionInterceptor({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        // Backup original fetch
        const originalFetch = window.fetch;

        // Override global fetch
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                // Clone response untuk bisa dibaca berkali-kali
                const clonedResponse = response.clone();

                // Cek status untuk auth errors
                if (response.status === 401 || response.status === 403) {
                    // Redirect ke login
                    router.push("/login");
                }

                return clonedResponse;
            } catch (error) {
                throw error;
            }
        };

        // Cleanup: restore original fetch
        return () => {
            window.fetch = originalFetch;
        };
    }, [router]);

    return <>{children}</>;
}
