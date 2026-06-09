"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function normalizePeriod(value?: string) {
    return value === "ytd" ? "ytd" : "quarter";
}

export function BmsPerformancePeriodFilter({
    initialPeriod,
}: {
    initialPeriod?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [period, setPeriod] = useState(normalizePeriod(initialPeriod));

    const navigate = useCallback(
        (nextPeriod: string) => {
            const params = new URLSearchParams();
            params.set("period", normalizePeriod(nextPeriod));

            startTransition(() => {
                router.push(
                    `/dashboard/bms-performance?${params.toString()}`,
                );
            });
        },
        [router],
    );

    function handlePeriodChange(value: string) {
        setPeriod(normalizePeriod(value));
        navigate(value);
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue>
                        {period === "ytd"
                            ? "YTD (Tahun Ini)"
                            : "Triwulan Ini"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="quarter" className="text-xs">
                        Triwulan Ini
                    </SelectItem>
                    <SelectItem value="ytd" className="text-xs">
                        YTD (Tahun Ini)
                    </SelectItem>
                </SelectContent>
            </Select>
            {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
        </div>
    );
}
