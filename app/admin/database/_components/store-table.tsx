"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { DeleteDialog } from "@/app/bmc/database/_components/delete-dialog";
import { AdminStoreFormDialog } from "./store-form-dialog";
import { AdminImportStoreDialog } from "./import-store-dialog";
import { adminDeleteStore } from "../actions";

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type Props = {
    stores: StoreRow[];
    allBranchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    searchParams: {
        sSearch?: string;
        status?: string;
        sBranch?: string;
    };
};

export function AdminStoreTable({
    stores,
    allBranchNames,
    totalCount,
    currentPage,
    totalPages,
    searchParams,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Local state for debounced search
    const [searchTerm, setSearchTerm] = useState(searchParams.sSearch ?? "");

    // Sync input when URL param changes (e.g. browser back/forward)
    useEffect(() => {
        setSearchTerm(searchParams.sSearch ?? "");
    }, [searchParams.sSearch]);

    // Debounce: only fire navigation 500ms after user stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.sSearch ?? "")) {
                updateParam("sSearch", searchTerm);
            }
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const updateParam = useCallback(
        (key: string, value: string | undefined) => {
            const next = new URLSearchParams(params.toString());
            if (!value || value === "all" || value === "") {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            if (key !== "storePage") next.delete("storePage");
            startTransition(() => {
                router.push(`${pathname}?${next.toString()}`);
            });
        },
        [params, pathname, router],
    );

    function handlePageChange(page: number) {
        const next = new URLSearchParams(params.toString());
        next.set("storePage", String(page));
        startTransition(() => router.push(`${pathname}?${next.toString()}`));
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    {isPending ? (
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12" cy="12" r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                            />
                        </svg>
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                        placeholder="Cari kode atau nama toko..."
                        value={searchTerm}
                        className="pl-9"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select
                    value={searchParams.sBranch ?? "all"}
                    onValueChange={(v) => updateParam("sBranch", v)}
                >
                    <SelectTrigger
                        className="w-full sm:w-48"
                        id="store-filter-branch"
                    >
                        <SelectValue placeholder="Semua Branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Branch</SelectItem>
                        {allBranchNames.map((b) => (
                            <SelectItem key={b} value={b}>
                                {b}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={searchParams.status ?? "all"}
                    onValueChange={(v) => updateParam("status", v)}
                >
                    <SelectTrigger
                        className="w-full sm:w-36"
                        id="store-filter-status"
                    >
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                </Select>

                <AdminImportStoreDialog allBranchNames={allBranchNames} />
                <AdminStoreFormDialog allBranchNames={allBranchNames} />
            </div>

            {/* Table */}
            <div className={`rounded-md border overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode</TableHead>
                            <TableHead>Nama Toko</TableHead>
                            <TableHead className="hidden sm:table-cell">
                                Cabang
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20 text-right">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stores.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    Tidak ada toko yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            stores.map((store) => (
                                <TableRow key={store.code}>
                                    <TableCell className="font-mono text-xs font-medium">
                                        {store.code}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {store.name}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                        {store.branchName}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                store.isActive
                                                    ? "default"
                                                    : "secondary"
                                            }
                                            className="text-xs"
                                        >
                                            {store.isActive
                                                ? "Aktif"
                                                : "Nonaktif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <AdminStoreFormDialog
                                                allBranchNames={allBranchNames}
                                                editStore={store}
                                                trigger={
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                            <DeleteDialog
                                                itemLabel={`toko ${store.name} (${store.code})`}
                                                onDelete={() =>
                                                    adminDeleteStore(store.code)
                                                }
                                                trigger={
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination + summary */}
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <span>
                    Total {totalCount} toko
                    {totalPages > 1
                        ? ` • Halaman ${currentPage} / ${totalPages}`
                        : ""}
                </span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
