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

        history.pushState({ _lightbox: true }, "");

        const handler = () => onCloseRef.current();
        window.addEventListener("popstate", handler, { once: true });

        return () => {
            window.removeEventListener("popstate", handler);
        };
    }, [isOpen]);

    // Close via button / backdrop: pop the history entry → triggers popstate → onClose
    return () => {
        if (history.state?._lightbox) {
            history.back();
        } else {
            onCloseRef.current();
        }
    };
}
