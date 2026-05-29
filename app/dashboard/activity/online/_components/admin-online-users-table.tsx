"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Search, UserRound } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
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
import {
    Filters,
    type Filter,
    type FilterFieldConfig,
} from "@/components/reui/filters";
import {
    getAdminOnlineUsers,
    type AdminOnlineUserFilters,
    type AdminOnlineUserRow,
} from "../actions";

const ROLE_OPTIONS = [
    { value: "BMS", label: "BMS" },
    { value: "BMC", label: "BMC" },
    { value: "BNM_MANAGER", label: "BnM Manager" },
    { value: "BRANCH_ADMIN", label: "Branch Admin" },
    { value: "ADMIN", label: "Admin" },
];

const ROLE_STYLES: Record<string, string> = {
    BMS: "border-blue-200 bg-blue-50 text-blue-700",
    BMC: "border-emerald-200 bg-emerald-50 text-emerald-700",
    BNM_MANAGER: "border-amber-200 bg-amber-50 text-amber-700",
    BRANCH_ADMIN: "border-purple-200 bg-purple-50 text-purple-700",
    ADMIN: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDateTime(date: Date | string) {
    return format(new Date(date), "dd MMM yyyy HH:mm:ss", { locale: id });
}

function formatRelativeLastSeen(date: Date | string) {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

    return formatDateTime(date);
}

export function AdminOnlineUsersTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
}: {
    initialData: AdminOnlineUserRow[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
}) {
    const [users, setUsers] = useState(initialData);
    const [nextCursor, setNextCursor] = useState(initialNextCursor);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [search, setSearch] = useState("");
    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>([]);

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const filterFields = useMemo<FilterFieldConfig<string>[]>(
        () => [
            {
                key: "branchName",
                label: "Cabang",
                type: "select",
                placeholder: "Pilih cabang",
                icon: <Building2 className="h-3.5 w-3.5" />,
                options: branches.map((branch) => ({
                    value: branch,
                    label: branch,
                })),
            },
            {
                key: "role",
                label: "Role",
                type: "select",
                placeholder: "Pilih role",
                icon: <UserRound className="h-3.5 w-3.5" />,
                options: ROLE_OPTIONS,
            },
        ],
        [branches],
    );

    const getFilterValue = useCallback(
        (key: string) =>
            activeFilters.find((filter) => filter.field === key)?.values[0] ??
            "",
        [activeFilters],
    );

    const searchValue = search.trim();
    const filters = useMemo<AdminOnlineUserFilters>(
        () => ({
            search: searchValue || undefined,
            branchName: String(getFilterValue("branchName")) || undefined,
            role: String(getFilterValue("role")) || undefined,
        }),
        [getFilterValue, searchValue],
    );
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const loadData = useCallback(
        async (cursor: string | null, isInitial = false) => {
            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const result = await getAdminOnlineUsers(cursor, 20, filters);

                if (isInitial) {
                    setUsers(result.users);
                    setTotalCount(result.totalCount);
                } else {
                    setUsers((prev) => {
                        const existing = new Set(prev.map((user) => user.NIK));
                        return [
                            ...prev,
                            ...result.users.filter(
                                (user) => !existing.has(user.NIK),
                            ),
                        ];
                    });
                }
                setNextCursor(result.nextCursor);
            } catch {
                toast.error("Gagal memuat user online");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [filters],
    );

    const resetFilters = useCallback(() => {
        setSearch("");
        setActiveFilters([]);
    }, []);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            loadData(null, true);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [filters, loadData]);

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

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [isFetchingNextPage, isLoading, loadData, nextCursor]);

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="font-medium text-foreground">
                        {totalCount.toLocaleString("id-ID")}
                    </span>{" "}
                    user online
                </div>
                {hasActiveFilter && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={resetFilters}
                    >
                        Reset Filter
                    </Button>
                )}
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari NIK, nama, email, cabang..."
                        className="h-8 bg-white pl-8 text-xs"
                    />
                </div>
                <Filters
                    filters={activeFilters}
                    fields={filterFields}
                    onChange={setActiveFilters}
                    size="sm"
                    allowMultiple={false}
                    className="w-full flex-1"
                    i18n={{
                        addFilter: "Filter",
                        searchFields: "Cari filter...",
                    }}
                />
            </div>

            <div className="min-w-0 overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="w-full overflow-x-auto">
                    <Table className="text-xs [&_td]:py-2 [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="min-w-[160px]">
                                    User
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Email
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Role
                                </TableHead>
                                <TableHead className="min-w-[220px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Terakhir Terlihat
                                </TableHead>
                                <TableHead className="min-w-[170px]">
                                    Timestamp
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-32 text-center text-sm text-muted-foreground"
                                    >
                                        Tidak ada user online sesuai filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.NIK}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {user.name}
                                            </div>
                                            <div className="font-mono text-[11px] text-muted-foreground">
                                                {user.NIK}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    ROLE_STYLES[user.role] ??
                                                    ROLE_STYLES.ADMIN
                                                }
                                            >
                                                {user.role === "BNM_MANAGER"
                                                    ? "BnM Manager"
                                                    : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.branchNames.join(", ") || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 text-emerald-700">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                {formatRelativeLastSeen(
                                                    user.lastSeen,
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {formatDateTime(user.lastSeen)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div ref={observerTarget} className="h-6" />
            {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
