"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Repeat, Search } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RecurringDamageStore } from "@/lib/recurring-damage";
import { HeaderWithInfo } from "./header-with-info";

export function RecurringStoreTable({
    stores,
    itemFocused,
    onSelectStore,
}: {
    stores: RecurringDamageStore[];
    itemFocused: boolean;
    onSelectStore: (storeCode: string) => void;
}) {
    const [search, setSearch] = useState("");

    const filteredStores = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return stores;
        return stores.filter(
            (store) =>
                store.storeCode.toLowerCase().includes(query) ||
                store.storeName.toLowerCase().includes(query),
        );
    }, [stores, search]);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-[280px]">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari kode / nama toko"
                            className="h-8 bg-background pl-8 text-xs"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Klik toko untuk melihat item yang rusak berulang beserta
                        laporannya.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[54px] text-[11px]">No</TableHead>
                                <TableHead className="min-w-[240px] text-[11px]">Toko</TableHead>
                                <TableHead className="min-w-[280px] text-[11px]">
                                    {itemFocused ? (
                                        <HeaderWithInfo
                                            label="Item terpilih"
                                            info="Item dari filter item dan berapa kali item itu tercatat rusak di toko ini pada periode terpilih."
                                        />
                                    ) : (
                                        <HeaderWithInfo
                                            label="Item paling sering rusak"
                                            info="Item checklist yang paling banyak tercatat rusak di toko ini pada periode terpilih."
                                        />
                                    )}
                                </TableHead>
                                <TableHead className="min-w-[180px] text-[11px]">
                                    <HeaderWithInfo
                                        label="Jumlah item rusak berulang"
                                        info="Banyaknya item checklist berbeda yang rusak 2 kali atau lebih di toko ini."
                                    />
                                </TableHead>
                                <TableHead className="w-[130px] text-[11px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <EmptyTable
                                            icon={Repeat}
                                            title={
                                                stores.length === 0
                                                    ? "Tidak ada toko rusak berulang"
                                                    : "Toko tidak ditemukan"
                                            }
                                            description={
                                                stores.length === 0
                                                    ? itemFocused
                                                        ? "Tidak ada toko yang item ini rusak berulang di periode ini."
                                                        : "Tidak ada toko dengan item rusak berulang di periode ini."
                                                    : "Tidak ada toko yang cocok dengan pencarian."
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStores.map((store, index) => (
                                    <TableRow
                                        key={store.storeCode}
                                        className="cursor-pointer"
                                        onClick={() => onSelectStore(store.storeCode)}
                                    >
                                        <TableCell className="text-xs text-muted-foreground">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="font-medium">{store.storeName}</div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {store.storeCode}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span>
                                                    <span className="font-medium">
                                                        {store.topItemId}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {" "}
                                                        · {store.topItemName}
                                                    </span>
                                                </span>
                                                <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                                                    rusak {store.maxFrequency}x
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <span className="font-medium">
                                                {store.recurringItemCount}
                                            </span>{" "}
                                            item
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onSelectStore(store.storeCode);
                                                }}
                                            >
                                                Lihat detail
                                                <ChevronRight data-icon="inline-end" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
