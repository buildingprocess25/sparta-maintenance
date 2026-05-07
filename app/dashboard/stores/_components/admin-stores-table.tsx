"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Pencil, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { getAdminStores, AdminStoreFilters } from "../actions";
import { AdminStoreFormDialog } from "@/app/admin/database/_components/store-form-dialog";
import { adminDeleteStore } from "@/app/admin/database/actions";
import { ImportStoresDialog } from "./import-stores-dialog";

type StoreItem = Awaited<ReturnType<typeof getAdminStores>>["stores"][0];

// ─── Delete confirmation dialog ───────────────────────────────────────────────
function DeleteStoreDialog({
    store,
    onDeleted,
}: {
    store: StoreItem;
    onDeleted: (code: string) => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await adminDeleteStore(store.code);
            if ("error" in result && result.error) {
                toast.error("Gagal menghapus toko", { description: result.error });
                return;
            }
            toast.success(`Toko ${store.name} berhasil dihapus`);
            onDeleted(store.code);
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
                    <AlertDialogTitle>Hapus Toko</AlertDialogTitle>
                    <AlertDialogDescription>
                        Yakin ingin menghapus{" "}
                        <strong>
                            {store.name} ({store.code})
                        </strong>
                        ? Tindakan ini tidak dapat dibatalkan.
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

// ─── Main table ───────────────────────────────────────────────────────────────
export function AdminStoresTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
}: {
    initialData: StoreItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
}) {
    const [stores, setStores] = useState<StoreItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [branchName, setBranchName] = useState("all");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial = false) => {
            const filters: AdminStoreFilters = {
                search: search || undefined,
                branchName: branchName === "all" ? undefined : branchName,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminStores(cursor, 20, filters);

                if (isInitial) {
                    setStores(res.stores);
                    setTotalCount(res.totalCount);
                } else {
                    setStores((prev) => [...prev, ...res.stores]);
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data toko");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search, branchName],
    );

    // Debounced reload on filter change
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => loadData(null, true), 300);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [search, branchName, loadData]);

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

    // Optimistic delete
    const handleDeleted = (code: string) => {
        setStores((prev) => prev.filter((s) => s.code !== code));
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
                    toko
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Search */}
                <div className="relative flex-[2] min-w-[180px]">
                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode atau nama toko..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Branch */}
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

                {/* Action buttons */}
                <div className="flex items-center gap-2 ml-auto">
                    <ImportStoresDialog branches={branches} />
                    <AdminStoreFormDialog allBranchNames={branches} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="text-xs [&_td]:py-[11px] [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[110px]">
                                    Kode Toko
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    Nama Toko
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="w-[80px]">
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
                                        colSpan={5}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : stores.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada toko yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stores.map((store) => (
                                    <TableRow key={store.code}>
                                        <TableCell className="font-mono font-medium">
                                            {store.code}
                                        </TableCell>
                                        <TableCell>{store.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {store.branchName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 font-medium ${
                                                    store.isActive
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-slate-50 text-slate-500 border-slate-200"
                                                }`}
                                            >
                                                {store.isActive
                                                    ? "Aktif"
                                                    : "Nonaktif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <AdminStoreFormDialog
                                                    allBranchNames={branches}
                                                    editStore={store}
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
                                                <DeleteStoreDialog
                                                    store={store}
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
                <div
                    ref={observerTarget}
                    className="h-10 flex items-center justify-center"
                >
                    {isFetchingNextPage && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );
}
