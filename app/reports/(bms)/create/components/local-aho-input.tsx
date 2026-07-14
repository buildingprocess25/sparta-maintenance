"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Input dengan local state supaya setiap karakter tidak memicu
 * update ke global checklist Map (dan re-render semua item).
 * Sync ke parent hanya saat focus keluar (onBlur).
 */
export function LocalAhoInput({
    id,
    initialValue,
    onCommit,
    required = false,
}: {
    id: string;
    initialValue: string;
    onCommit: (value: string) => void;
    required?: boolean;
}) {
    const [localValue, setLocalValue] = useState(initialValue);

    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    return (
        <Input
            id={id}
            required={required}
            maxLength={100}
            placeholder="Masukkan nomor tiket AHO"
            value={localValue}
            onChange={(event) => {
                const value = event.target.value;
                setLocalValue(value);
                onCommit(value);
            }}
            onBlur={() => {
                const value = localValue.trim();
                setLocalValue(value);
                onCommit(value);
            }}
        />
    );
}
