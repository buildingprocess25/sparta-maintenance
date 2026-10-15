"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    formatBnmReviewDeadline,
    type BnmReviewState,
} from "@/lib/bnm-review-deadline";
import { cn } from "@/lib/utils";

type BnmReviewBadgeProps = {
    state: Exclude<BnmReviewState, "ON_TIME">;
    deadlineAt: Date;
};

export function BnmReviewBadge({ state, deadlineAt }: BnmReviewBadgeProps) {
    const deadline = formatBnmReviewDeadline(deadlineAt);
    const isOverdue = state === "OVERDUE";

    return (
        <TooltipProvider>
            <div className="mt-1 flex items-center gap-1">
                <Badge
                    variant="outline"
                    className={cn(
                        isOverdue
                            ? "border-red-300 bg-red-100 text-red-800"
                            : "border-amber-300 bg-amber-100 text-amber-800",
                    )}
                >
                    {isOverdue ? "Lewat batas" : "Lewat 24 jam"}
                </Badge>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Info batas waktu review"
                            className="text-muted-foreground"
                        >
                            <Info className="h-3.5 w-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isOverdue
                            ? `Batas review (${deadline}) sudah terlewat. BMS pemilik laporan tidak bisa membuat laporan baru sampai laporan ini Anda setujui atau kembalikan.`
                            : `Sudah lebih dari 24 jam menunggu approval Anda. Batas review: ${deadline}. Jika terlewat, BMS pemilik laporan tidak bisa membuat laporan baru sampai laporan ini Anda proses.`}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
