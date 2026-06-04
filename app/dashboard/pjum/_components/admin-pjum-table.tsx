"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
    AlertTriangle,
    ArrowUpRight,
    Building2,
    CalendarDays,
    CircleDot,
    FileCheck2,
    FileText,
    Loader2,
    Search,
} from "lucide-react";
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
    createFilter,
    Filters,
    type Filter,
    type FilterFieldConfig,
} from "@/components/reui/filters";
import { getAdminPjum } from "../actions";
import type { AdminPjumFilters, PjumRow, PjumSummary } from "../actions";
import {
    getPjumStatusBadgeClass,
    getPjumStatusLabel,
} from "@/lib/pjum-status";
import { cn } from "@/lib/utils";

const STALE_PENDING_DAYS = 7;

const PJUM_STATUS_FILTER_OPTIONS = [
    { value: "PENDING_APPROVAL", label: "Menunggu Review" },
    { value: "APPROVED", label: "Disetujui" },
];

function formatDate(date: Date) {
    return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function formatDateTime(date: Date) {
    return format(new Date(date), "dd MMM yyyy HH:mm", { locale: id });
}

export function AdminPjumTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    initialSummary,
    initialFilters,
    branches,
}: {
    initialData: PjumRow[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    initialSummary: PjumSummary;
    initialFilters?: AdminPjumFilters;
    branches: string[];
}) {
    const [pjums, setPjums] = useState<PjumRow[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
    const [summary, setSummary] = useState<PjumSummary>(initialSummary);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [search, setSearch] = useState("");
    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(() =>
        [
            initialFilters?.status && initialFilters.status !== "all"
                ? createFilter<string>("status", "is", [
                      initialFilters.status,
                  ])
                : null,
            initialFilters?.branchName && initialFilters.branchName !== "all"
                ? createFilter<string>("branchName", "is", [
                      initialFilters.branchName,
                  ])
                : null,
        ].filter((filter): filter is Filter<string> => filter !== null),
    );

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
                key: "status",
                label: "Status",
                type: "select",
                placeholder: "Pilih status",
                icon: <CircleDot className="h-3.5 w-3.5" />,
                options: PJUM_STATUS_FILTER_OPTIONS,
            },
            {
                key: "fromDate",
                label: "Dari",
                type: "date",
                icon: <CalendarDays className="h-3.5 w-3.5" />,
            },
            {
                key: "toDate",
                label: "Sampai",
                type: "date",
                icon: <CalendarDays className="h-3.5 w-3.5" />,
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
    const branchName = String(getFilterValue("branchName"));
    const status = String(getFilterValue("status"));
    const fromDate = String(getFilterValue("fromDate"));
    const toDate = String(getFilterValue("toDate"));
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminPjumFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
                status: status || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminPjum(cursor, 20, filters);

                if (isInitial) {
                    setPjums(res.pjums);
                    setTotalCount(res.totalCount);
                    setSummary(res.summary);
                } else {
                    setPjums((prev) => {
                        const existing = new Set(prev.map((item) => item.id));
                        return [
                            ...prev,
                            ...res.pjums.filter(
                                (item) => !existing.has(item.id),
                            ),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data PJUM");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [searchValue, branchName, status, fromDate, toDate],
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
    }, [searchValue, branchName, status, fromDate, toDate, loadData]);

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
    }, [nextCursor, isFetchingNextPage, isLoading, loadData]);

    return (
        <div className="space-y-4">
            <PjumSummaryStrip summary={summary} />

            <div className="space-y-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                        Total{" "}
                        <span className="font-medium text-foreground">
                            {totalCount}
                        </span>{" "}
                        PJUM sesuai filter
                    </div>
                    {hasActiveFilter ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={resetFilters}
                        >
                            Reset
                        </Button>
                    ) : null}
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari PJUM, BMS, cabang..."
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
            </div>

            <div className="rounded-lg border bg-background">
                <div className="overflow-x-auto">
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="min-w-[210px]">
                                    Minggu / Periode
                                </TableHead>
                                <TableHead className="min-w-[130px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[170px]">
                                    BMS
                                </TableHead>
                                <TableHead className="w-[110px]">
                                    Laporan
                                </TableHead>
                                <TableHead className="w-[135px]">
                                    Status
                                </TableHead>
                                <TableHead className="min-w-[145px]">
                                    Dibuat
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
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : pjums.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada data PJUM ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pjums.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={cn(
                                            "align-top",
                                            item.isStalePending &&
                                                "bg-amber-50/45",
                                        )}
                                    >
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/pjum/${item.id}`}
                                                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                                            >
                                                Minggu {item.weekNumber}
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <div className="mt-1 text-[10px] text-muted-foreground">
                                                {formatDate(item.fromDate)} -{" "}
                                                {formatDate(item.toDate)}
                                            </div>
                                            {item.isStalePending ? (
                                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Pending terlalu lama
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {item.branchName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {item.bmsName}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {item.bmsNIK}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold">
                                                {item.reportCount}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "font-normal",
                                                    getPjumStatusBadgeClass(
                                                        item.status,
                                                    ),
                                                )}
                                            >
                                                {getPjumStatusLabel(
                                                    item.status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatDateTime(item.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                    <span>
                        Menampilkan{" "}
                        <span className="font-medium text-foreground">
                            {pjums.length}
                        </span>{" "}
                        dari{" "}
                        <span className="font-medium text-foreground">
                            {totalCount}
                        </span>{" "}
                        PJUM
                    </span>
                    {nextCursor && !isLoading ? (
                        <div ref={observerTarget} className="h-5 min-w-5">
                            {isFetchingNextPage ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function PjumSummaryStrip({ summary }: { summary: PjumSummary }) {
    const items = [
        {
            label: "Total PJUM",
            value: summary.total,
            icon: FileText,
            tone: "text-slate-700",
        },
        {
            label: "Menunggu Review",
            value: summary.pendingReview,
            icon: AlertTriangle,
            tone: "text-amber-700",
        },
        {
            label: "Disetujui",
            value: summary.approved,
            icon: FileCheck2,
            tone: "text-emerald-700",
        },
        {
            label: "Laporan Masuk PJUM",
            value: summary.reportCount,
            icon: FileText,
            tone: "text-sky-700",
        },
        {
            label: `Pending > ${STALE_PENDING_DAYS} hari`,
            value: summary.stalePending,
            icon: AlertTriangle,
            tone: "text-red-700",
        },
    ];

    return (
        <div className="grid gap-2 md:grid-cols-5">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="flex min-h-20 items-center gap-3 rounded-lg border bg-background px-3 py-2"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <item.icon className={cn("h-4 w-4", item.tone)} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">
                            {item.label}
                        </div>
                        <div className="text-lg font-semibold leading-tight">
                            {item.value.toLocaleString("id-ID")}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
