"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
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
    // Tanpa item → tab "Per item"; dengan item → tab toko yang difilter item itu.
    const params = new URLSearchParams({ view: input.itemId ? "store" : "item" });
    if (input.branchName !== "all") params.set("branch", input.branchName);
    if (input.quarter !== "all") params.set("quarter", String(input.quarter));
    if (input.itemId) params.set("item", input.itemId);
    return `/dashboard/recurring-damage?${params.toString()}`;
}

export function DamagedItemsWidget() {
    const [quarter, setQuarter] = useState<QuarterFilter>("all");
    const [branchName, setBranchName] = useState<string>("all");
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    // Hasil disimpan bersama key filternya agar respons lama tidak menimpa yang baru.
    const [result, setResult] = useState<{
        key: string;
        items: DamagedItemRank[] | null;
    } | null>(null);
    const requestKey = `${branchName}|${quarter}`;

    useEffect(() => {
        getPreventiveBranchOptions()
            .then((branches) => {
                setAvailableBranches(branches);
                if (branches.length === 1) {
                    setBranchName(branches[0]);
                }
            })
            .catch(() => setAvailableBranches([]));
    }, []);

    useEffect(() => {
        let ignore = false;
        const key = `${branchName}|${quarter}`;
        getDamagedItemRanking({
            year: getJakartaYear(),
            quarter: quarter === "all" ? undefined : quarter,
            branchName,
        })
            .then((ranking) => {
                if (!ignore) setResult({ key, items: ranking });
            })
            .catch(() => {
                if (!ignore) setResult({ key, items: null });
            });
        return () => {
            ignore = true;
        };
    }, [quarter, branchName]);

    const isLoading = result?.key !== requestKey;
    const items = result?.items;
    const hasError = result !== null && result.items === null;
    const [topItem, ...otherItems] = items ?? [];

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
                        Lihat semua item <ArrowUpRight className="h-3 w-3 ml-0.5" />
                    </Link>
                </div>
            </div>

            <div className={isLoading && result ? "opacity-60 transition-opacity" : undefined}>
                {result === null ? (
                    <div className="text-sm text-muted-foreground">Memuat data...</div>
                ) : hasError || !items ? (
                    <div className="text-sm text-muted-foreground text-center py-4">Gagal memuat data.</div>
                ) : items.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        Belum ada item rusak di periode ini.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
                        {/* Sorotan item teratas */}
                        <Link
                            href={buildRecurringDamageHref({ branchName, quarter, itemId: topItem.itemId })}
                            className="group flex flex-col rounded-lg border border-amber-200 bg-amber-50 p-5 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
                        >
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                Paling sering rusak
                            </span>
                            <span className="mt-2 text-base font-semibold text-amber-900 dark:text-amber-100">
                                {topItem.itemId} · {topItem.itemName}
                            </span>
                            <span className="text-xs text-amber-700 dark:text-amber-300">
                                {topItem.categoryName}
                            </span>
                            <span className="mt-4 text-3xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
                                {topItem.damageCount.toLocaleString("id-ID")}
                                <span className="ml-1 text-sm font-normal">kali rusak</span>
                            </span>
                            <span className="text-sm text-amber-800 dark:text-amber-200">
                                berulang di {topItem.recurringStoreCount.toLocaleString("id-ID")} toko
                            </span>
                            <span className="mt-4 flex items-center text-xs font-medium text-amber-800 group-hover:underline dark:text-amber-200">
                                Lihat toko <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                        </Link>

                        {/* Peringkat 2–5 */}
                        <div className="divide-y">
                            {otherItems.map((item, i) => (
                                <Link
                                    key={item.itemId}
                                    href={buildRecurringDamageHref({ branchName, quarter, itemId: item.itemId })}
                                    className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-colors"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                                        {i + 2}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-foreground/90 group-hover:underline">
                                            {item.itemId} · {item.itemName}
                                        </div>
                                        <div className="truncate text-[11px] text-muted-foreground">
                                            {item.categoryName}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end">
                                        <span className="text-sm font-semibold tabular-nums text-foreground">
                                            {item.damageCount.toLocaleString("id-ID")} kali
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            berulang di {item.recurringStoreCount.toLocaleString("id-ID")} toko
                                        </span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
