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
import { getAdminUsers, AdminUserFilters } from "../actions";
import { AdminUserFormDialog } from "@/app/admin/database/_components/user-form-dialog";
import { AdminImportUserDialog } from "@/app/admin/database/_components/import-user-dialog";
import { adminDeleteUser } from "@/app/admin/database/actions";

type UserItem = Awaited<ReturnType<typeof getAdminUsers>>["users"][0];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    BMS: "BMS",
    BMC: "BMC",
    BNM_MANAGER: "BnM Manager",
    BRANCH_ADMIN: "Branch Admin",
};

const ROLE_STYLES: Record<string, string> = {
    ADMIN: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-100",
    BMS: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
    BMC: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    BNM_MANAGER: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
    BRANCH_ADMIN: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
};

const ROLE_FILTER_OPTIONS = [
    { value: "all", label: "Semua Role" },
    { value: "ADMIN", label: "Admin" },
    { value: "BMS", label: "BMS" },
    { value: "BMC", label: "BMC" },
    { value: "BNM_MANAGER", label: "BnM Manager" },
    { value: "BRANCH_ADMIN", label: "Branch Admin" },
];

// ─── Delete confirmation dialog ───────────────────────────────────────────────
function DeleteUserDialog({
    user,
    onDeleted,
}: {
    user: UserItem;
    onDeleted: (nik: string) => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await adminDeleteUser(user.NIK);
            if ("error" in result && result.error) {
                toast.error("Gagal menghapus user", {
                    description: result.detail ?? result.error,
                });
                return;
            }
            toast.success(`User ${user.name} berhasil dihapus`);
            onDeleted(user.NIK);
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
                    <AlertDialogTitle>Hapus User</AlertDialogTitle>
                    <AlertDialogDescription>
                        Yakin ingin menghapus{" "}
                        <strong>
                            {user.name} ({user.NIK})
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
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        Ya, Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ─── Main table ───────────────────────────────────────────────────────────────
export function AdminUsersTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    areaNames,
    canManage = true,
    allowAdminRole = true,
}: {
    initialData: UserItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    areaNames: string[];
    canManage?: boolean;
    allowAdminRole?: boolean;
}) {
    const [users, setUsers] = useState<UserItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("all");
    const [branchName, setBranchName] = useState("all");
    const [areaName, setAreaName] = useState("all");
    const roleFilterOptions = allowAdminRole
        ? ROLE_FILTER_OPTIONS
        : ROLE_FILTER_OPTIONS.filter((option) => option.value !== "ADMIN");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial = false) => {
            const filters: AdminUserFilters = {
                search: search || undefined,
                role: role === "all" ? undefined : role,
                branchName: branchName === "all" ? undefined : branchName,
                areaName: areaName === "all" ? undefined : areaName,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminUsers(cursor, 20, filters);

                if (isInitial) {
                    setUsers(res.users);
                    setTotalCount(res.totalCount);
                } else {
                    setUsers((prev) => {
                        const existing = new Set(prev.map((user) => user.NIK));
                        return [
                            ...prev,
                            ...res.users.filter(
                                (user) => !existing.has(user.NIK),
                            ),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data user");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search, role, branchName, areaName],
    );

    // Debounced reload on filter change
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => loadData(null, true), 300);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [search, role, branchName, areaName, loadData]);

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
    const handleDeleted = (nik: string) => {
        setUsers((prev) => prev.filter((u) => u.NIK !== nik));
        setTotalCount((prev) => prev - 1);
    };

    return (
        <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="text-foreground font-medium">
                        {totalCount}
                    </span>{" "}
                    user
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full">
                {/* Search */}
                <div className="relative flex-[2] min-w-[180px]">
                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari NIK, nama, atau email..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Role */}
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="flex-[0.8] min-w-[130px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Semua Role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roleFilterOptions.map((opt) => (
                            <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="text-xs"
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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

                {areaNames.length > 0 ? (
                    <Select value={areaName} onValueChange={setAreaName}>
                        <SelectTrigger className="flex-[0.8] min-w-[130px] bg-white h-8 text-xs">
                            <SelectValue placeholder="Semua Area" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">
                                Semua Area
                            </SelectItem>
                            {areaNames.map((area) => (
                                <SelectItem
                                    key={area}
                                    value={area}
                                    className="text-xs"
                                >
                                    {area}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}

                {canManage ? (
                    <div className="flex items-center gap-2 ml-auto">
                        <AdminImportUserDialog
                            allowAdminRole={allowAdminRole}
                            branchNames={branches}
                        />
                        <AdminUserFormDialog
                            allBranchNames={branches}
                            allowAdminRole={allowAdminRole}
                        />
                    </div>
                ) : null}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table scrollObserverRef={observerTarget} className="text-xs [&_td]:py-[11px] [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[110px]">NIK</TableHead>
                                <TableHead className="min-w-[160px]">
                                    Nama
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Email
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="w-[110px]">
                                    Role
                                </TableHead>
                                {canManage ? (
                                    <TableHead className="w-[80px] text-center">
                                        Aksi
                                    </TableHead>
                                ) : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !isFetchingNextPage ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={canManage ? 6 : 5}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={canManage ? 6 : 5}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada user yang ditemukan
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
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.branchNames.length > 0
                                                ? user.branchNames.join(", ")
                                                : "—"}
                                            {user.areaNames.length > 0 ? (
                                                <div className="text-[10px]">
                                                    {user.areaNames.join(", ")}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 font-medium ${
                                                    ROLE_STYLES[user.role] ?? 
                                                    "bg-slate-50 text-slate-700 border-slate-200"
                                                }`}
                                            >
                                                {ROLE_LABELS[user.role] ?? user.role}
                                            </Badge>
                                        </TableCell>
                                        {canManage ? (
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {(() => {
                                                        const isRestrictedForBmc = !allowAdminRole && (user.role === "BMC" || user.role === "BNM_MANAGER" || user.role === "ADMIN");
                                                        
                                                        return (
                                                            <>
                                                                <AdminUserFormDialog
                                                                    allBranchNames={branches}
                                                                    editUser={user}
                                                                    allowAdminRole={allowAdminRole}
                                                                    trigger={
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className={
                                                                                isRestrictedForBmc
                                                                                    ? "h-7 w-7 text-muted-foreground opacity-50 cursor-not-allowed"
                                                                                    : "h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                            }
                                                                            disabled={isRestrictedForBmc}
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    }
                                                                />
                                                                {isRestrictedForBmc ? (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 text-muted-foreground opacity-50 cursor-not-allowed"
                                                                        disabled
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                ) : (
                                                                    <DeleteUserDialog
                                                                        user={user}
                                                                        onDeleted={handleDeleted}
                                                                    />
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                        ) : null}
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
