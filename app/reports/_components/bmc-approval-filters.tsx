"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Filter, CalendarDays } from "lucide-react";

type Props = {
    role: string;
};

export function BmcApprovalFilters({ role }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "all";
    const dateRange = searchParams.get("dateRange") ?? "all";

    const push = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Cari no. laporan, toko..."
                    className="pl-9 bg-background"
                    defaultValue={q}
                    onChange={(e) => push("q", e.target.value)}
                />
            </div>

            {/* Status filter — only shown if role has multiple statuses */}
            {role !== "BNM_MANAGER" && (
                <Select value={status} onValueChange={(v) => push("status", v)}>
                    <SelectTrigger
                        className="w-auto bg-background"
                        aria-label="Filter berdasarkan status"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending_estimation">
                            Menunggu Persetujuan Estimasi
                        </SelectItem>
                        <SelectItem value="pending_review">
                            Menunggu Review Penyelesaian
                        </SelectItem>
                    </SelectContent>
                </Select>
            )}

            {/* Date range filter */}
            <Select
                value={dateRange}
                onValueChange={(v) => push("dateRange", v)}
            >
                <SelectTrigger
                    className="w-auto bg-background"
                    aria-label="Filter berdasarkan periode waktu"
                >
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Periode" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Waktu</SelectItem>
                    <SelectItem value="this_month">Bulan Ini</SelectItem>
                    <SelectItem value="last_month">Bulan Lalu</SelectItem>
                    <SelectItem value="last_3_months">
                        3 Bulan Terakhir
                    </SelectItem>
                    <SelectItem value="last_6_months">
                        6 Bulan Terakhir
                    </SelectItem>
                    <SelectItem value="this_year">Tahun Ini</SelectItem>
                    <SelectItem value="last_year">Tahun Lalu</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
