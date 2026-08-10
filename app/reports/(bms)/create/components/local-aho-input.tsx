"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getActiveAhoTickets } from "@/app/dashboard/aho-tickets/actions";
import { Loader2 } from "lucide-react";
import { useOnClickOutside } from "@/lib/hooks/use-on-click-outside";

export function LocalAhoInput({
    id,
    storeCode,
    initialValue,
    onCommit,
    required = false,
}: {
    id: string;
    storeCode?: string;
    initialValue: string;
    onCommit: (value: string) => void;
    required?: boolean;
}) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [options, setOptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(containerRef, () => {
        setIsOpen(false);
        onCommit(localValue.trim());
    });

    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (!storeCode) {
            setOptions([]);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        getActiveAhoTickets(storeCode).then((tickets) => {
            if (isMounted) {
                setOptions(tickets);
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [storeCode]);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(localValue.toLowerCase())
    );

    const hasExactMatch = options.some(opt => opt.toLowerCase() === localValue.trim().toLowerCase());
    const showCreatable = localValue.trim() !== "" && !hasExactMatch;

    const totalItems = filteredOptions.length + (showCreatable ? 1 : 0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "ArrowDown") {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                const selected = filteredOptions[focusedIndex];
                setLocalValue(selected);
                onCommit(selected);
                setIsOpen(false);
            } else if (showCreatable && focusedIndex === filteredOptions.length) {
                onCommit(localValue.trim());
                setIsOpen(false);
            } else {
                onCommit(localValue.trim());
                setIsOpen(false);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            onCommit(localValue.trim());
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <Input
                    id={id}
                    required={required}
                    maxLength={100}
                    placeholder="Pilih atau ketik nomor tiket AHO..."
                    value={localValue}
                    autoComplete="off"
                    onChange={(event) => {
                        const value = event.target.value;
                        setLocalValue(value);
                        setIsOpen(true);
                        setFocusedIndex(-1);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setFocusedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className="pr-8"
                />
                {isLoading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full z-50 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                    {filteredOptions.length === 0 && !showCreatable ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {isLoading ? "Memuat tiket..." : "Tidak ada tiket ditemukan."}
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredOptions.map((opt, index) => (
                                <div
                                    key={opt}
                                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                                        focusedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                    onClick={() => {
                                        setLocalValue(opt);
                                        onCommit(opt);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt}
                                </div>
                            ))}
                            {showCreatable && (
                                <div
                                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                                        focusedIndex === filteredOptions.length ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                    onClick={() => {
                                        onCommit(localValue.trim());
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="text-muted-foreground mr-1">Gunakan</span>
                                    <span className="font-medium">&quot;{localValue.trim()}&quot;</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
