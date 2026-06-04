"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
    Activity,
    Building2,
    CheckCircle2,
    Layers3,
    Loader2,
    RotateCcw,
    Search,
    UserRound,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    getAdminActivityEvents,
    type AdminActivityEvent,
    type AdminActivityFilters,
    type AdminActivitySummary,
} from "../actions";
import {
    ACTION_OPTIONS,
    MODULE_OPTIONS,
    ROLE_OPTIONS,
    getActionBadgeClass,
    getActivityModuleLabel,
    getModuleBadgeClass,
} from "../activity-format";

function formatDateTime(date: Date | string) {
    return format(new Date(date), "dd MMM yyyy HH:mm", { locale: id });
}

function formatNumber(value: number) {
    return value.toLocaleString("id-ID");
}

function SummaryCard({
    title,
    value,
    total,
    description,
    icon: Icon,
    href,
}: {
    title: string;
    value: number;
    total?: number;
    description: string;
    icon: ElementType;
    href?: string;
}) {
    const content = (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div className="space-y-1">
                    <CardDescription>{title}</CardDescription>
                    <CardTitle className="text-2xl">
                        {formatNumber(value)}
                    </CardTitle>
                </div>
                <span className="rounded-md border bg-slate-50 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                </span>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground">
                    {total === undefined
                        ? description
                        : `${description} dari total ${formatNumber(total)} sesuai periode`}
                </p>
            </CardContent>
        </Card>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block">
            {content}
        </Link>
    );
}

export function AdminActivityTable({
    initialData,
    initialNextOffset,
    initialTotalCount,
    initialSummary,
    branches,
    period,
}: {
    initialData: AdminActivityEvent[];
    initialNextOffset: number | null;
    initialTotalCount: number;
    initialSummary: AdminActivitySummary;
    branches: string[];
    period: string;
}) {
    const [events, setEvents] = useState(initialData);
    const [nextOffset, setNextOffset] = useState(initialNextOffset);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [summary, setSummary] = useState(initialSummary);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [search, setSearch] = useState("");
    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>([]);

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        setEvents(initialData);
        setNextOffset(initialNextOffset);
        setTotalCount(initialTotalCount);
        setSummary(initialSummary);
    }, [initialData, initialNextOffset, initialSummary, initialTotalCount]);

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
            {
                key: "module",
                label: "Modul",
                type: "select",
                placeholder: "Pilih modul",
                icon: <Layers3 className="h-3.5 w-3.5" />,
                options: MODULE_OPTIONS,
            },
            {
                key: "action",
                label: "Aktivitas",
                type: "select",
                placeholder: "Pilih aktivitas",
                icon: <Activity className="h-3.5 w-3.5" />,
                options: ACTION_OPTIONS,
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
    const filters = useMemo<AdminActivityFilters>(
        () => ({
            search: searchValue || undefined,
            branchName: String(getFilterValue("branchName")) || undefined,
            role: String(getFilterValue("role")) || undefined,
            module: String(getFilterValue("module")) || undefined,
            action: String(getFilterValue("action")) || undefined,
        }),
        [getFilterValue, searchValue],
    );
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const loadData = useCallback(
        async (offset: number, isInitial = false) => {
            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const result = await getAdminActivityEvents(
                    offset,
                    20,
                    period,
                    filters,
                );

                if (isInitial) {
                    setEvents(result.events);
                    setTotalCount(result.totalCount);
                    setSummary(result.summary);
                } else {
                    setEvents((prev) => {
                        const existing = new Set(prev.map((item) => item.id));
                        return [
                            ...prev,
                            ...result.events.filter(
                                (item) => !existing.has(item.id),
                            ),
                        ];
                    });
                }
                setNextOffset(result.nextOffset);
            } catch {
                toast.error("Gagal memuat aktivitas user");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [filters, period],
    );

    const resetFilters = useCallback(() => {
        setSearch("");
        setActiveFilters([]);
    }, []);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            loadData(0, true);
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
                    nextOffset !== null &&
                    !isFetchingNextPage &&
                    !isLoading
                ) {
                    loadData(nextOffset);
                }
            },
            { threshold: 0.1 },
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [isFetchingNextPage, isLoading, loadData, nextOffset]);

    return (
        <div className="min-w-0 space-y-4">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Aktivitas Hari Ini"
                    value={summary.activityToday}
                    total={summary.activityPeriod}
                    description="Hari ini"
                    icon={Activity}
                />
                <SummaryCard
                    title="User Aktif"
                    value={summary.activeUsers}
                    description="User yang aktif hari ini"
                    icon={UserRound}
                    href="/dashboard/activity/online"
                />
                <SummaryCard
                    title="Revisi / Reject"
                    value={summary.revisionRejectToday}
                    total={summary.revisionRejectPeriod}
                    description="Hari ini"
                    icon={RotateCcw}
                />
                <SummaryCard
                    title="Approval Selesai"
                    value={summary.approvalDoneToday}
                    total={summary.approvalDonePeriod}
                    description="Hari ini"
                    icon={CheckCircle2}
                />
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="font-medium text-foreground">
                        {formatNumber(totalCount)}
                    </span>{" "}
                    aktivitas sesuai filter
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
                        placeholder="Cari laporan, toko, cabang, user..."
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
                                <TableHead className="min-w-[140px]">
                                    Waktu
                                </TableHead>
                                <TableHead className="min-w-[160px]">
                                    Aktor
                                </TableHead>
                                <TableHead className="min-w-[90px]">
                                    Role
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Modul
                                </TableHead>
                                <TableHead className="min-w-[190px]">
                                    Aktivitas
                                </TableHead>
                                <TableHead className="min-w-[160px]">
                                    Target
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Catatan
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : events.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-32 text-center text-sm text-muted-foreground"
                                    >
                                        Tidak ada aktivitas pada periode atau
                                        filter ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                events.map((event) => (
                                    <TableRow
                                        key={event.id}
                                        tabIndex={event.targetHref ? 0 : -1}
                                        className={
                                            event.targetHref
                                                ? "cursor-pointer hover:bg-muted/50"
                                                : undefined
                                        }
                                        onClick={() => {
                                            if (event.targetHref) {
                                                window.location.assign(
                                                    event.targetHref,
                                                );
                                            }
                                        }}
                                        onKeyDown={(keyboardEvent) => {
                                            if (
                                                event.targetHref &&
                                                (keyboardEvent.key ===
                                                    "Enter" ||
                                                    keyboardEvent.key === " ")
                                            ) {
                                                keyboardEvent.preventDefault();
                                                window.location.assign(
                                                    event.targetHref,
                                                );
                                            }
                                        }}
                                    >
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {formatDateTime(event.occurredAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground">
                                                {event.actor.name}
                                            </div>
                                            <div className="font-mono text-[11px] text-muted-foreground">
                                                {event.actor.NIK}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {event.actor.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{event.branchName}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getModuleBadgeClass(
                                                    event.module,
                                                )}
                                            >
                                                {getActivityModuleLabel(
                                                    event.module,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getActionBadgeClass(
                                                    event.action,
                                                )}
                                            >
                                                {event.actionLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {event.targetLabel}
                                            </div>
                                            {event.storeName && (
                                                <div className="text-muted-foreground">
                                                    {event.storeName}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[260px] truncate text-muted-foreground">
                                            {event.notes ?? "-"}
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
