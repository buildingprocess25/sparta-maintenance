"use client";

import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { RealisasiPeriod } from "../queries";

export function BranchFilterSelect({
    period,
    branch,
    branches,
}: {
    period: RealisasiPeriod;
    branch: string;
    branches: string[];
}) {
    const router = useRouter();

    function handleChange(value: string) {
        const params = new URLSearchParams();
        params.set("period", period);
        if (value !== "all") {
            params.set("branch", value);
        }
        router.push(`/dashboard/realisasi?${params.toString()}`);
    }

    return (
        <Select defaultValue={branch} onValueChange={handleChange}>
            <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                        {b}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
