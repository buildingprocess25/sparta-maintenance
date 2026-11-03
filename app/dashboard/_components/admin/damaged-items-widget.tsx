"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPreventiveBranchOptions } from "../../preventive/actions";
import { getDamagedItemRanking } from "../../recurring-damage/actions";
import type { DamagedItemRank } from "@/lib/recurring-damage";
import { getJakartaYear } from "@/lib/time";

type QuarterFilter = "all" | 1 | 2 | 3 | 4;

function buildRecurringDamageHref(input: {
    branchName: string;
    quarter: QuarterFilter;
    itemId?: string;
}) {
    const params = new URLSearchParams();
    if (input.branchName !== "all") params.set("branch", input.branchName);
    if (input.quarter !== "all") params.set("quarter", String(input.quarter));
    if (input.itemId) params.set("item", input.itemId);
    const query = params.toString();
    return query ? `/dashboard/recurring-damage?${query}` : "/dashboard/recurring-damage";
}

export function DamagedItemsWidget() {
    const [quarter, setQuarter] = useState<QuarterFilter>("all");
    const [branchName, setBranchName] = useState<string>("all");
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [items, setItems] = useState<DamagedItemRank[] | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        getPreventiveBranchOptions().then((branches) => {
            setAvailableBranches(branches);
            if (branches.length === 1) {
                setBranchName(branches[0]);
            }
        });
    }, []);

    useEffect(() => {
        startTransition(() => {
            getDamagedItemRanking({
                year: getJakartaYear(),
                quarter: quarter === "all" ? undefined : quarter,
                branchName,
            })
                .then((result) => {
                    setItems(result);
                    setHasError(false);
                })
                .catch(() => setHasError(true));
        });
    }, [quarter, branchName]);

    const maxCount = items?.[0]?.damageCount ?? 0;

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Item Paling Sering Rusak</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        5 item checklist dengan kejadian rusak terbanyak tahun {getJakartaYear()}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={branchName} onValueChange={setBranchName} disabled={availableBranches.length <= 1}>
                        <SelectTrigger className="w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Semua Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableBranches.length !== 1 && (
                                <SelectItem value="all">Semua Cabang</SelectItem>
                            )}
                            {availableBranches.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={quarter.toString()}
                        onValueChange={(val) => setQuarter(val === "all" ? "all" : (parseInt(val) as 1 | 2 | 3 | 4))}
                    >
                        <SelectTrigger className="w-[150px] h-9 text-xs">
                            <SelectValue placeholder="Semua Triwulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Triwulan</SelectItem>
                            <SelectItem value="1">Triwulan 1</SelectItem>
                            <SelectItem value="2">Triwulan 2</SelectItem>
                            <SelectItem value="3">Triwulan 3</SelectItem>
                            <SelectItem value="4">Triwulan 4</SelectItem>
                        </SelectContent>
                    </Select>

                    <Link
                        href={buildRecurringDamageHref({ branchName, quarter })}
                        className="text-xs text-primary hover:underline flex items-center ml-2"
                    >
                        Detail Kerusakan Berulang <ArrowUpRight className="h-3 w-3 ml-0.5" />
                    </Link>
                </div>
            </div>

            <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
                {hasError ? (
                    <div className="text-sm text-muted-foreground text-center py-4">Gagal memuat data.</div>
                ) : items === null ? (
                    <div className="text-sm text-muted-foreground">Memuat data...</div>
                ) : items.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        Belum ada item rusak di periode ini.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item, i) => (
                            <Link
                                key={item.itemId}
                                href={buildRecurringDamageHref({ branchName, quarter, itemId: item.itemId })}
                                className="group flex flex-col gap-2 p-2.5 -mx-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex justify-between items-start gap-3 text-sm">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="w-5 text-center text-xs font-semibold text-muted-foreground mt-0.5">
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="font-medium text-foreground/90 truncate">
                                                {item.itemId} · {item.itemName}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {item.categoryName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                                            rusak {item.damageCount.toLocaleString("id-ID")} kali
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            berulang di {item.recurringStoreCount.toLocaleString("id-ID")} toko
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden ml-8 max-w-[calc(100%-2rem)]">
                                    <div
                                        className="h-full bg-rose-500 transition-all duration-700 ease-out"
                                        style={{ width: `${maxCount > 0 ? (item.damageCount / maxCount) * 100 : 0}%` }}
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
