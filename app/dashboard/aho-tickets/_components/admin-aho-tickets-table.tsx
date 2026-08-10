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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminAhoTickets, AdminAhoTicketFilters, adminDeleteAhoTicket } from "../actions";
import { AdminAhoTicketFormDialog } from "./admin-aho-ticket-form-dialog";
import { ImportAhoTicketsDialog } from "./import-aho-tickets-dialog";
import { useTransition } from "react";

type TicketItem = Awaited<ReturnType<typeof getAdminAhoTickets>>["tickets"][0];

function DeleteTicketDialog({
    ticket,
    onDeleted,
}: {
    ticket: TicketItem;
    onDeleted: (id: string) => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await adminDeleteAhoTicket(ticket.id);
            if (result.error) {
                toast.error("Gagal menghapus tiket", { description: result.error });
                return;
            }
            toast.success(`Tiket ${ticket.problemNo} berhasil dihapus`);
            onDeleted(ticket.id);
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Tiket AHO</AlertDialogTitle>
                    <AlertDialogDescription>
                        Yakin ingin menghapus tiket AHO dengan No Problem{" "}
                        <strong>{ticket.problemNo}</strong> untuk toko{" "}
                        <strong>{ticket.storeCode}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending && (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        )}
                        Ya, Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function AdminAhoTicketsTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    allBrands,
    areaNamesByBranch,
}: {
    initialData: TicketItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches?: string[];
    allBrands?: string[];
    areaNamesByBranch?: Record<string, string[]>;
}) {
    const [tickets, setTickets] = useState<TicketItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [branchName, setBranchName] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial = false) => {
            const filters: AdminAhoTicketFilters = {
                search: search || undefined,
                branchName: branchName === "all" ? undefined : branchName,
                status: statusFilter === "all" ? undefined : statusFilter,
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
        [search, branchName, statusFilter],
    );

    // Debounced reload on filter change
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => loadData(null, true), 300);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [search, branchName, statusFilter, loadData]);

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

    const handleDeleted = (id: string) => {
        setTickets((prev) => prev.filter((t) => t.id !== id));
        setTotalCount((prev) => prev - 1);
    };

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
                <div className="relative flex-[2] min-w-[200px]">
                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode toko, nama toko, atau no tiket..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Branch Filter */}
                {branches && branches.length > 0 && (
                    <Select value={branchName} onValueChange={setBranchName}>
                        <SelectTrigger className="flex-[0.8] min-w-[130px] bg-white h-8 text-xs">
                            <SelectValue placeholder="Semua Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">
                                Semua Cabang
                            </SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b} value={b} className="text-xs">
                                    {b}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="flex-[0.8] min-w-[120px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                        <SelectItem value="New" className="text-xs">New</SelectItem>
                        <SelectItem value="Progress" className="text-xs">Progress</SelectItem>
                    </SelectContent>
                </Select>

                {/* Tambah AHO Button */}
                <div className="flex items-center gap-2 ml-auto">
                    <ImportAhoTicketsDialog />
                    <AdminAhoTicketFormDialog />
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
                                <TableHead className="w-[140px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="w-[160px]">
                                    No Problem
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    Status
                                </TableHead>
                                <TableHead className="w-[80px] text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !isFetchingNextPage ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
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
                                        <TableCell className="text-muted-foreground">
                                            {ticket.branchName || "-"}
                                        </TableCell>
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
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <AdminAhoTicketFormDialog
                                                    editTicket={ticket}
                                                    trigger={
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    }
                                                />
                                                <DeleteTicketDialog
                                                    ticket={ticket}
                                                    onDeleted={handleDeleted}
                                                />
                                            </div>
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
