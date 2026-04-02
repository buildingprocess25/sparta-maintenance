"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Store, Pencil, Search, X } from "lucide-react";
import { StoreFormDialog } from "./store-form-dialog";
import { ImportStoreDialog } from "./import-store-dialog";

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type Props = {
    stores: StoreRow[];
    branchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    searchParams: {
        sSearch?: string;
        status?: string;
    };
};

export function StoreTable({
    stores,
    branchNames,
    totalCount,
    currentPage,
    totalPages,
    searchParams,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const currentSearchParams = useSearchParams();

    // Local state for search
    const [searchTerm, setSearchTerm] = useState(searchParams.sSearch || "");

    const createQueryString = useCallback(
        (name: string, value: string, resetPageParam?: string) => {
            const params = new URLSearchParams(currentSearchParams.toString());

            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }

            // Also reset page when doing filter/search changes
            if (resetPageParam) {
                params.set(resetPageParam, "1");
            }
            // Always ensure tab is correct
            params.set("tab", "stores");

            router.push(pathname + "?" + params.toString());
        },
        [currentSearchParams, pathname, router],
    );

    // Sync input when URL param changes
    useEffect(() => {
        // eslint-disable-next-line
        setSearchTerm(searchParams.sSearch || "");
    }, [searchParams.sSearch]);

    // Handle search query updates with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.sSearch || "")) {
                createQueryString("sSearch", searchTerm, "storePage");
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, searchParams.sSearch, createQueryString]);

    const createHref = (page: number) => {
        const params = new URLSearchParams(currentSearchParams.toString());
        params.set("tab", "stores");
        params.set("storePage", page.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handleStatusChange = (val: string) => {
        createQueryString("status", val === "all" ? "" : val, "storePage");
    };

    const getVisiblePages = (current: number, total: number) => {
        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);

        if (current <= 2) end = 5;
        if (current >= total - 1) start = total - 4;

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const visiblePages = getVisiblePages(currentPage, totalPages);

    return (
        <div className="space-y-4">
            {/* Filter and Action bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari Kode atau Nama Toko..."
                            className="pl-9 pr-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1.5 h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <Select
                        value={searchParams.status || "all"}
                        onValueChange={handleStatusChange}
                    >
                        <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="active">Aktif</SelectItem>
                            <SelectItem value="inactive">Nonaktif</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm text-muted-foreground hidden lg:block">
                        {totalCount} toko ditemukan
                    </p>
                    <ImportStoreDialog branchNames={branchNames} />
                    <StoreFormDialog branchNames={branchNames} />
                </div>
            </div>

            <div className="rounded-md border">
                {stores.length === 0 ? (
                    <Empty className="py-12">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Store />
                            </EmptyMedia>
                            <EmptyTitle>Tabel Kosong</EmptyTitle>
                            <EmptyDescription>
                                Tidak ditemukan data toko yang sesuai dengan
                                pencarian Anda.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-24">
                                    Kode Toko
                                </TableHead>
                                <TableHead>Nama Toko</TableHead>
                                <TableHead className="w-32">
                                    Status Toko
                                </TableHead>
                                <TableHead className="w-20 text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stores.map((store) => (
                                <TableRow key={store.code}>
                                    <TableCell className="font-mono text-xs">
                                        {store.code}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {store.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                store.isActive
                                                    ? "secondary" // Secondary maps to solid background in common shadcn config, depending on overrides. But typically "default" is solid.
                                                    : "outline"
                                            }
                                            className={
                                                store.isActive
                                                    ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 pointer-events-none font-normal text-xs"
                                                    : "text-muted-foreground font-normal text-xs bg-muted"
                                            }
                                        >
                                            {store.isActive
                                                ? "Aktif"
                                                : "Nonaktif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <StoreFormDialog
                                                branchNames={branchNames}
                                                editStore={store}
                                                trigger={
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground hidden sm:block">
                        Menampilkan halaman {currentPage} dari {totalPages}
                    </p>
                    <Pagination className="mx-0 sm:mx-auto w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href={createHref(
                                        Math.max(1, currentPage - 1),
                                    )}
                                    className={
                                        currentPage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : undefined
                                    }
                                />
                            </PaginationItem>

                            {visiblePages[0] > 1 && (
                                <>
                                    <PaginationItem className="hidden sm:inline-block">
                                        <PaginationLink href={createHref(1)}>
                                            1
                                        </PaginationLink>
                                    </PaginationItem>
                                    {visiblePages[0] > 2 && (
                                        <PaginationItem className="hidden sm:inline-block">
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}
                                </>
                            )}

                            {visiblePages.map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href={createHref(page)}
                                        isActive={page === currentPage}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            {visiblePages[visiblePages.length - 1] <
                                totalPages && (
                                <>
                                    {visiblePages[visiblePages.length - 1] <
                                        totalPages - 1 && (
                                        <PaginationItem className="hidden sm:inline-block">
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}
                                    <PaginationItem className="hidden sm:inline-block">
                                        <PaginationLink
                                            href={createHref(totalPages)}
                                        >
                                            {totalPages}
                                        </PaginationLink>
                                    </PaginationItem>
                                </>
                            )}

                            <PaginationItem>
                                <PaginationNext
                                    href={createHref(
                                        Math.min(totalPages, currentPage + 1),
                                    )}
                                    className={
                                        currentPage >= totalPages
                                            ? "pointer-events-none opacity-50"
                                            : undefined
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
