"use client";

import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/** Label header tabel dengan ikon info; wajib dibungkus `TooltipProvider`. */
export function HeaderWithInfo({ label, info }: { label: string; info: string }) {
    return (
        <div className="flex items-center gap-1">
            {label}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={`Info ${label}`}
                        className="text-muted-foreground"
                    >
                        <Info className="h-3.5 w-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>{info}</TooltipContent>
            </Tooltip>
        </div>
    );
}
