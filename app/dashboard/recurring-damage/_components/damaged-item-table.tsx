"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ListChecks, Search } from "lucide-react";
import { EmptyTable } from "@/components/dashboard/empty-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { checklistCategories } from "@/lib/checklist-data";
import type { DamagedItemRank } from "@/lib/recurring-damage";
import { cn } from "@/lib/utils";
import { HeaderWithInfo } from "./header-with-info";

const ALL_CATEGORIES = "all";

function formatCount(value: number) {
    return value.toLocaleString("id-ID");
}

export function DamagedItemTable({
    items,
    onSelectItem,
}: {
    items: DamagedItemRank[];
    onSelectItem: (itemId: string) => void;
}) {
    const [category, setCategory] = useState(ALL_CATEGORIES);
    const [search, setSearch] = useState("");

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(
            (item) =>
                (category === ALL_CATEGORIES || item.categoryName === category) &&
                (!query ||
                    item.itemId.toLowerCase().includes(query) ||
                    item.itemName.toLowerCase().includes(query)),
        );
    }, [items, category, search]);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full lg:w-[280px]">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari kode / nama item"
                                className="h-8 bg-background pl-8 text-xs"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-8 w-full bg-background text-xs sm:w-[240px]">
                                <SelectValue placeholder="Semua Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_CATEGORIES}>Semua Kategori</SelectItem>
                                {checklistCategories.map((option) => (
                                    <SelectItem key={option.id} value={option.title}>
                                        {option.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Klik item untuk melihat toko yang item itu rusak berulang.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[54px] text-[11px]">No</TableHead>
                                <TableHead className="min-w-[260px] text-[11px]">Item</TableHead>
                                <TableHead className="min-w-[200px] text-[11px]">Kategori</TableHead>
                                <TableHead className="min-w-[120px] text-[11px]">
                                    <HeaderWithInfo
                                        label="Kali rusak"
                                        info="Jumlah laporan yang menandai item ini rusak pada periode terpilih."
                                    />
                                </TableHead>
                                <TableHead className="min-w-[140px] text-[11px]">
                                    <HeaderWithInfo
                                        label="Toko terdampak"
                                        info="Jumlah toko yang item ini pernah tercatat rusak minimal 1 kali."
                                    />
                                </TableHead>
                                <TableHead className="min-w-[140px] text-[11px]">
                                    <HeaderWithInfo
                                        label="Toko rusak berulang"
                                        info="Jumlah toko yang item ini rusak 2 kali atau lebih."
                                    />
                                </TableHead>
                                <TableHead className="w-[130px] text-[11px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <EmptyTable
                                            icon={ListChecks}
                                            title="Item tidak ditemukan"
                                            description="Tidak ada item yang cocok dengan pencarian atau kategori."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item, index) => {
                                    const canOpen = item.recurringStoreCount > 0;
                                    const isZero = item.damageCount === 0;
                                    return (
                                        <TableRow
                                            key={item.itemId}
                                            className={cn(
                                                canOpen && "cursor-pointer",
                                                isZero && "text-muted-foreground",
                                            )}
                                            onClick={canOpen ? () => onSelectItem(item.itemId) : undefined}
                                        >
                                            <TableCell className="text-xs text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <span className="font-medium">{item.itemId}</span>
                                                <span className={isZero ? undefined : "text-muted-foreground"}>
                                                    {" "}
                                                    · {item.itemName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {item.categoryName}
                                            </TableCell>
                                            <TableCell className="text-xs tabular-nums">
                                                <span className={isZero ? undefined : "font-semibold"}>
                                                    {formatCount(item.damageCount)}
                                                </span>{" "}
                                                kali
                                            </TableCell>
                                            <TableCell className="text-xs tabular-nums">
                                                {formatCount(item.affectedStoreCount)} toko
                                            </TableCell>
                                            <TableCell className="text-xs tabular-nums">
                                                {formatCount(item.recurringStoreCount)} toko
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canOpen ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onSelectItem(item.itemId);
                                                        }}
                                                    >
                                                        Lihat toko
                                                        <ChevronRight data-icon="inline-end" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
