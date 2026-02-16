import { useEffect, useState } from "react";

/**
 * Custom hook untuk debounce value
 * @param value - Value yang ingin di-debounce
 * @param delay - Delay dalam ms (default: 1000ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 1000): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set timeout untuk update debounced value
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup timeout jika value berubah sebelum delay selesai
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
