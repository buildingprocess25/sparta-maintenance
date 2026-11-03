"use client";

import { useMemo, useState } from "react";
import { Repeat, Search } from "lucide-react";
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
import type { RecurringDamageStore } from "@/lib/recurring-damage";

export function RecurringStoreTable({
    stores,
    onSelectStore,
}: {
    stores: RecurringDamageStore[];
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
        <div className="flex flex-col gap-3">
            <div className="relative w-full lg:w-[280px]">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari kode / nama toko"
                    className="h-8 bg-background pl-8 text-xs"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>
            <div className="overflow-hidden rounded-lg border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[54px] text-[11px]">No</TableHead>
                            <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                            <TableHead className="min-w-[240px] text-[11px]">
                                Item rusak tersering
                            </TableHead>
                            <TableHead className="min-w-[120px] text-[11px]">
                                Frekuensi rusak maks
                            </TableHead>
                            <TableHead className="min-w-[120px] text-[11px]">
                                Item rusak berulang
                            </TableHead>
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
                                                ? "Tidak ada toko dengan item rusak berulang di periode ini."
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
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="h-auto p-0 text-xs font-medium text-foreground"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectStore(store.storeCode);
                                            }}
                                        >
                                            {store.storeName}
                                        </Button>
                                        <div className="text-[11px] text-muted-foreground">
                                            {store.storeCode}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-medium">{store.topItemId}</span>
                                        <span className="text-muted-foreground">
                                            {" "}
                                            · {store.topItemName}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                                            {store.maxFrequency}x
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {store.recurringItemCount}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
