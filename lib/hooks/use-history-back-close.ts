"use client";

import { useEffect, useRef } from "react";

/**
 * Pushes a history entry when a lightbox/preview becomes visible so that
 * pressing the device back button closes it instead of navigating away.
 *
 * Returns a `close` function to use for button and backdrop click handlers.
 * Always use this returned function — do NOT call the original onClose directly
 * from UI events, or the pushed history entry will become stale.
 *
 * Usage:
 *   const close = useHistoryBackClose(!!previewUrl, () => setPreviewUrl(null));
 *   // use `close` on the × button and backdrop onClick
 */
export function useHistoryBackClose(
    isOpen: boolean,
    onClose: () => void,
): () => void {
    // Keep a stable ref so the popstate handler always calls the latest onClose
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return;

        let pushedHistory = false;
        try {
            history.pushState({ _lightbox: true }, "");
            pushedHistory = true;
        } catch (error) {
            console.warn("Unable to push lightbox history state", error);
        }

        const handler = () => onCloseRef.current();
        if (pushedHistory) {
            window.addEventListener("popstate", handler, { once: true });
        }

        return () => {
            if (pushedHistory) {
                window.removeEventListener("popstate", handler);
            }
        };
    }, [isOpen]);

    // Close via button / backdrop: pop the history entry → triggers popstate → onClose
    return () => {
        try {
            if (history.state?._lightbox) {
                history.back();
                return;
            }
        } catch (error) {
            console.warn("Unable to close lightbox through browser history", error);
        }

        onCloseRef.current();
    };
}
