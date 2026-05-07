"use client";

import { useEffect } from "react";

/**
 * A headless component that pings the server every 5 minutes 
 * to update the user's online status in the server's memory map.
 */
export function PresenceTracker() {
    useEffect(() => {
        // Function to send a ping
        const pingPresence = () => {
            fetch("/api/presence", { method: "POST" }).catch(() => {
                // Ignore network errors or unauthorized errors silently
            });
        };

        // Send a ping immediately on mount (when user opens the app or logs in)
        pingPresence();

        // Then send a ping every 5 minutes
        const PING_INTERVAL_MS = 5 * 60 * 1000;
        const interval = setInterval(pingPresence, PING_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    return null; // This component doesn't render anything
}
