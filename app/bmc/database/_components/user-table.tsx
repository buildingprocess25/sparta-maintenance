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
import { Users, Pencil, Search, X } from "lucide-react";
import { UserFormDialog } from "./user-form-dialog";
import { ImportUserDialog } from "./import-user-dialog";
import { DeleteDialog } from "./delete-dialog";
import { deleteUser } from "../actions";

const ROLE_LABELS: Record<string, string> = {
    BMS: "BMS",
    BRANCH_ADMIN: "Branch Admin",
};

type UserRow = {
    NIK: string;
    name: string;
    email: string;
    role: string;
    branchNames: string[];
};

type Props = {
    users: UserRow[];
    branchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    searchParams: {
        uSearch?: string;
        uRole?: string;
    };
};

export function UserTable({
    users,
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
    const [searchTerm, setSearchTerm] = useState(searchParams.uSearch || "");

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
            // Always ensure tab is correct to prevent bug when page reloads without tab config
            params.set("tab", "users");

            router.push(pathname + "?" + params.toString());
        },
        [currentSearchParams, pathname, router],
    );

    // Sync input when URL param changes outwardly
    useEffect(() => {
        // eslint-disable-next-line
        setSearchTerm(searchParams.uSearch || "");
    }, [searchParams.uSearch]);

    // Handle search query updates with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.uSearch || "")) {
                createQueryString("uSearch", searchTerm, "userPage");
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, searchParams.uSearch, createQueryString]);

    const createHref = (page: number) => {
        const params = new URLSearchParams(currentSearchParams.toString());
        params.set("tab", "users");
        params.set("userPage", page.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handleRoleChange = (val: string) => {
        createQueryString("uRole", val === "all" ? "" : val, "userPage");
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
                            placeholder="Cari NIK atau Nama..."
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
                        value={searchParams.uRole || "all"}
                        onValueChange={handleRoleChange}
                    >
                        <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Semua Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Role</SelectItem>
                            <SelectItem value="BMS">BMS</SelectItem>
                            <SelectItem value="BRANCH_ADMIN">
                                Branch Admin
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm text-muted-foreground hidden lg:block">
                        {totalCount} user ditemukan
                    </p>
                    <ImportUserDialog />
                    <UserFormDialog branchNames={branchNames} />
                </div>
            </div>

            <div className="rounded-md border">
                {users.length === 0 ? (
                    <Empty className="py-12">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Users />
                            </EmptyMedia>
                            <EmptyTitle>Tabel Kosong</EmptyTitle>
                            <EmptyDescription>
                                Tidak ditemukan data user yang sesuai dengan
                                pencarian Anda.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-30">NIK</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead className="hidden sm:table-cell">
                                    Email
                                </TableHead>
                                <TableHead className="w-35">Role</TableHead>
                                <TableHead className="hidden md:table-cell">
                                    Cabang
                                </TableHead>
                                <TableHead className="w-25 text-center">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.NIK}>
                                    <TableCell className="font-mono text-xs">
                                        {user.NIK}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                        {user.name}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className="font-normal text-xs"
                                        >
                                            {ROLE_LABELS[user.role] ??
                                                user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                        {user.branchNames.join(", ")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <UserFormDialog
                                                branchNames={branchNames}
                                                editUser={user}
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
                                            <DeleteDialog
                                                itemLabel={`user ${user.name}`}
                                                onDelete={() =>
                                                    deleteUser(user.NIK)
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
