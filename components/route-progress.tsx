"use client";

import NProgress from "nprogress";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

NProgress.configure({
    showSpinner: false,
    minimum: 0.08,
    speed: 350,
    trickleSpeed: 120,
});

const MINIMUM_VISIBLE_MS = 450;

function isPlainLeftClick(event: MouseEvent) {
    return (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

export function RouteProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRunningRef = useRef(false);
    const startedAtRef = useRef(0);

    const clearDoneTimer = useCallback(() => {
        if (!doneTimerRef.current) return;

        clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
    }, []);

    const startProgress = useCallback(() => {
        clearDoneTimer();
        startedAtRef.current = performance.now();
        isRunningRef.current = true;
        NProgress.set(0.08);
        NProgress.start();
    }, [clearDoneTimer]);

    const finishProgress = useCallback(() => {
        if (!isRunningRef.current) return;

        const elapsed = performance.now() - startedAtRef.current;
        const remaining = Math.max(120, MINIMUM_VISIBLE_MS - elapsed);

        clearDoneTimer();
        doneTimerRef.current = setTimeout(() => {
            NProgress.done();
            isRunningRef.current = false;
            doneTimerRef.current = null;
        }, remaining);
    }, [clearDoneTimer]);

    useEffect(() => {
        finishProgress();
    }, [finishProgress, pathname, searchParams]);

    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (!isPlainLeftClick(event) || event.defaultPrevented) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) return;
            if (anchor.target && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;
            if (anchor.dataset.routeProgress === "false") return;
            if (anchor.dataset.nprogress === "ignore") return;

            const nextUrl = new URL(anchor.href, window.location.href);
            if (nextUrl.origin !== window.location.origin) return;

            const currentUrl = new URL(window.location.href);
            const sameRoute =
                nextUrl.pathname === currentUrl.pathname &&
                nextUrl.search === currentUrl.search;

            if (!sameRoute) startProgress();
        }

        document.addEventListener("click", handleClick, true);
        return () => {
            document.removeEventListener("click", handleClick, true);
            clearDoneTimer();
            NProgress.done();
        };
    }, [clearDoneTimer, startProgress]);

    return null;
}
