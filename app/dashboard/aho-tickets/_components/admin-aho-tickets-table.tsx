"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { getAdminAhoTickets, AdminAhoTicketFilters } from "../actions";

type TicketItem = Awaited<ReturnType<typeof getAdminAhoTickets>>["tickets"][0];

export function AdminAhoTicketsTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
}: {
    initialData: TicketItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
}) {
    const [tickets, setTickets] = useState<TicketItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial = false) => {
            const filters: AdminAhoTicketFilters = {
                search: search || undefined,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminAhoTickets(cursor, 20, filters);

                if (isInitial) {
                    setTickets(res.tickets);
                    setTotalCount(res.totalCount);
                } else {
                    setTickets((prev) => {
                        const existing = new Set(prev.map((t) => t.id));
                        return [
                            ...prev,
                            ...res.tickets.filter((t) => !existing.has(t.id)),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data tiket AHO");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search],
    );

    // Debounced reload on filter change
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => loadData(null, true), 300);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [search, loadData]);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    nextCursor &&
                    !isFetchingNextPage &&
                    !isLoading
                ) {
                    loadData(nextCursor);
                }
            },
            { threshold: 0.1 },
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [nextCursor, isFetchingNextPage, isLoading, loadData]);

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="text-foreground font-medium">
                        {totalCount}
                    </span>{" "}
                    tiket aktif
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode toko, nama toko, atau no tiket..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table scrollObserverRef={observerTarget} className="text-xs [&_td]:py-[11px] [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[110px]">
                                    Kode Toko
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    Nama Toko
                                </TableHead>
                                <TableHead className="w-[160px]">
                                    No Problem
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !isFetchingNextPage ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada tiket AHO yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-mono font-medium">
                                            {ticket.storeCode}
                                        </TableCell>
                                        <TableCell>{ticket.store?.name || "-"}</TableCell>
                                        <TableCell className="font-mono">{ticket.problemNo}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 font-medium ${
                                                    ticket.status.toLowerCase() === "new"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                }`}
                                            >
                                                {ticket.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Infinite scroll trigger */}
                <div className="h-10 flex items-center justify-center">
                    {isFetchingNextPage && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );
}
