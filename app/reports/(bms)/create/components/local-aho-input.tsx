"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActiveAhoTickets } from "@/app/dashboard/aho-tickets/actions";
import { Loader2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function LocalAhoInput({
    id,
    storeCode,
    branchCode,
    initialValue,
    selectedTickets = new Set(),
    onCommit,
    required = false,
}: {
    id: string;
    storeCode?: string;
    branchCode?: string;
    initialValue: string;
    selectedTickets?: Set<string>;
    onCommit: (value: string) => void;
    required?: boolean;
}) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [options, setOptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isOpen, setIsOpen] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const hasAutoFilled = useRef(false);

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

    const smartPrefix = options.length > 0 
        ? options[0].substring(0, 7) 
        : branchCode ? `${branchCode}-P-` : "";

    useEffect(() => {
        hasAutoFilled.current = false;
    }, [storeCode]);

    useEffect(() => {
        if (manualInput === "" && smartPrefix && !hasAutoFilled.current) {
            setManualInput(smartPrefix);
            hasAutoFilled.current = true;
        }
    }, [smartPrefix, manualInput]);

    const handleSelect = (val: string) => {
        setLocalValue(val);
        onCommit(val);
        setIsOpen(false);
        setManualInput("");
    };

    const handleManualSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (manualInput.trim()) {
            handleSelect(manualInput.trim());
        }
    };

    return (
        <div className="relative w-full">
            {/* Hidden input for native HTML form validation */}
            <input 
                type="text"
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                required={required}
                value={localValue}
                onChange={() => {}}
                tabIndex={-1}
            />
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button 
                        id={id}
                        variant="outline" 
                        role="combobox"
                        aria-expanded={isOpen}
                        className={cn(
                            "w-full justify-between font-normal",
                            !localValue && "text-muted-foreground"
                        )}
                    >
                        <span className="truncate">
                            {localValue || "Pilih nomor tiket AHO..."}
                        </span>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin opacity-50 shrink-0 ml-2" />
                        ) : (
                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        )}
                    </Button>
                </PopoverTrigger>
                
                <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-2 flex flex-col gap-2"
                    align="start"
                    sideOffset={4}
                >
                    {options.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {options.map((opt) => {
                                const isSelected = selectedTickets.has(opt) && opt !== localValue;
                                return (
                                    <div
                                        key={opt}
                                        className={cn(
                                            "relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                            isSelected 
                                                ? "opacity-50 cursor-not-allowed bg-muted/50" 
                                                : "cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                            localValue === opt 
                                                ? "bg-primary/10 text-primary font-medium" 
                                                : ""
                                        )}
                                        onClick={() => {
                                            if (!isSelected) handleSelect(opt);
                                        }}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && (
                                            <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 pl-2">
                                                Terpilih
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                            {isLoading ? "Memuat tiket..." : "Tidak ada tiket tersedia."}
                        </div>
                    )}
                    
                    <div className="h-px bg-border my-1" />
                    
                    <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                        <Input 
                            placeholder="Ketik no manual..." 
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Button 
                            type="submit" 
                            size="sm" 
                            className="h-8 px-3" 
                            disabled={!/^[A-Z0-9]{4}-P-[A-Z]\d{2}-\d+$/i.test(manualInput.trim())}
                        >
                            Pakai
                        </Button>
                    </form>
                </PopoverContent>
            </Popover>
        </div>
    );
}
