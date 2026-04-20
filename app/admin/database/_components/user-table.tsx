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
import { AdminUserFormDialog } from "./user-form-dialog";
import { AdminImportUserDialog } from "./import-user-dialog";
import { adminDeleteUser } from "../actions";

const ROLE_LABELS: Record<string, string> = {
    BMS: "BMS",
    BMC: "BMC",
    BNM_MANAGER: "BnM Manager",
    BRANCH_ADMIN: "Branch Admin",
    ADMIN: "Admin Pusat",
};

const ROLE_VARIANTS: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
> = {
    BMS: "secondary",
    BMC: "default",
    BNM_MANAGER: "default",
    BRANCH_ADMIN: "outline",
    ADMIN: "destructive",
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
    allBranchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    searchParams: {
        uSearch?: string;
        uRole?: string;
        uBranch?: string;
    };
};

export function AdminUserTable({
    users,
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
    const [searchTerm, setSearchTerm] = useState(searchParams.uSearch ?? "");

    // Sync input when URL param changes (e.g. browser back/forward)
    useEffect(() => {
        setSearchTerm(searchParams.uSearch ?? "");
    }, [searchParams.uSearch]);

    // Debounce: only fire navigation 500ms after user stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.uSearch ?? "")) {
                updateParam("uSearch", searchTerm);
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
            // Reset page on filter change
            if (key !== "userPage") next.delete("userPage");
            startTransition(() => {
                router.push(`${pathname}?${next.toString()}`);
            });
        },
        [params, pathname, router],
    );

    function handlePageChange(page: number) {
        const next = new URLSearchParams(params.toString());
        next.set("userPage", String(page));
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
                        placeholder="Cari NIK, nama, atau email..."
                        value={searchTerm}
                        className="pl-9"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select
                    value={searchParams.uRole ?? "all"}
                    onValueChange={(v) => updateParam("uRole", v)}
                >
                    <SelectTrigger className="w-full sm:w-44" id="filter-role">
                        <SelectValue placeholder="Semua Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Role</SelectItem>
                        <SelectItem value="BMS">BMS</SelectItem>
                        <SelectItem value="BMC">BMC</SelectItem>
                        <SelectItem value="BNM_MANAGER">BnM Manager</SelectItem>
                        <SelectItem value="BRANCH_ADMIN">
                            Branch Admin
                        </SelectItem>
                        <SelectItem value="ADMIN">Admin Pusat</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={searchParams.uBranch ?? "all"}
                    onValueChange={(v) => updateParam("uBranch", v)}
                >
                    <SelectTrigger
                        className="w-full sm:w-48"
                        id="filter-branch"
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

                <AdminImportUserDialog />
                <AdminUserFormDialog allBranchNames={allBranchNames} />
            </div>

            {/* Table */}
            <div className={`rounded-md border overflow-x-auto transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIK</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="hidden sm:table-cell">
                                Email
                            </TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="hidden md:table-cell">
                                Branch
                            </TableHead>
                            <TableHead className="w-20 text-right">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    Tidak ada user yang ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.NIK}>
                                    <TableCell className="font-mono text-xs">
                                        {user.NIK}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {user.name}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                ROLE_VARIANTS[user.role] ??
                                                "secondary"
                                            }
                                            className="text-xs"
                                        >
                                            {ROLE_LABELS[user.role] ??
                                                user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                        {user.branchNames.length > 0
                                            ? user.branchNames.join(", ")
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <AdminUserFormDialog
                                                allBranchNames={allBranchNames}
                                                editUser={user}
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
                                                itemLabel={`user ${user.name} (${user.NIK})`}
                                                onDelete={() =>
                                                    adminDeleteUser(user.NIK)
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
                    Total {totalCount} user
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
