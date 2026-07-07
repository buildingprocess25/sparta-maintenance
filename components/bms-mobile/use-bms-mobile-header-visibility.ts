"use client";

import { useEffect, useState } from "react";

export function useBmsMobileHeaderVisibility() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let lastY = window.scrollY;

        function handleScroll() {
            const nextY = window.scrollY;
            setIsVisible(nextY < 16 || nextY < lastY);
            lastY = nextY;
        }

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return isVisible;
}
