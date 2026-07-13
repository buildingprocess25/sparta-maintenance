"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatJakartaDate, formatJakartaDateTime } from "@/lib/time";
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
import { getPjumStatusBadgeClass, getPjumStatusLabel } from "@/lib/pjum-status";
import { cn } from "@/lib/utils";

const PJUM_STATUS_FILTER_OPTIONS = [
    { value: "PENDING_APPROVAL", label: "Menunggu Review" },
    { value: "APPROVED", label: "Disetujui" },
];
const QUICK_FILTERS = [
    { key: "all", label: "Semua" },
    { key: "review_bnm", label: "Review BNM" },
    { key: "approved", label: "Disetujui" },
] as const;

type QuickFilterKey = (typeof QUICK_FILTERS)[number]["key"];

function resolveInitialQuickFilter(
    initialStatus?: string,
): QuickFilterKey {
    if (initialStatus === "PENDING_APPROVAL") return "review_bnm";
    if (initialStatus === "APPROVED") return "approved";
    return "all";
}

function formatDate(date: Date) {
    return formatJakartaDate(date);
}

function formatDateTime(date: Date) {
    return formatJakartaDateTime(date);
}

export function AdminPjumTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    initialSummary,
    initialFilters,
    branches,
    areaNames,
}: {
    initialData: PjumRow[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    initialSummary: PjumSummary;
    initialFilters?: AdminPjumFilters;
    branches: string[];
    areaNames: string[];
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
    const [quickFilter, setQuickFilter] = useState<QuickFilterKey>(() =>
        resolveInitialQuickFilter(initialFilters?.status),
    );
    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(() =>
        [
            initialFilters?.status && initialFilters.status !== "all"
                ? resolveInitialQuickFilter(initialFilters.status) !== "all"
                    ? null
                    : createFilter<string>("status", "is", [
                          initialFilters.status,
                      ])
                : null,
            initialFilters?.branchName && initialFilters.branchName !== "all"
                ? createFilter<string>("branchName", "is", [
                      initialFilters.branchName,
                  ])
                : null,
            initialFilters?.areaName && initialFilters.areaName !== "all"
                ? createFilter<string>("areaName", "is", [
                      initialFilters.areaName,
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
            ...(areaNames.length > 0
                ? [
                      {
                          key: "areaName",
                          label: "Area",
                          type: "select" as const,
                          placeholder: "Pilih area",
                          icon: <Building2 className="h-3.5 w-3.5" />,
                          options: areaNames.map((areaName) => ({
                              value: areaName,
                              label: areaName,
                          })),
                      },
                  ]
                : []),
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
        [branches, areaNames],
    );

    const getFilterValue = useCallback(
        (key: string) =>
            activeFilters.find((filter) => filter.field === key)?.values[0] ??
            "",
        [activeFilters],
    );

    const searchValue = search.trim();
    const branchName = String(getFilterValue("branchName"));
    const areaName = String(getFilterValue("areaName"));
    const status = String(getFilterValue("status"));
    const fromDate = String(getFilterValue("fromDate"));
    const toDate = String(getFilterValue("toDate"));
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;
    const quickStatus =
        quickFilter === "review_bnm"
            ? "PENDING_APPROVAL"
            : quickFilter === "approved"
              ? "APPROVED"
              : "";
    const hasAnyActiveFilter = hasActiveFilter || quickFilter !== "all";

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminPjumFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
                areaName: areaName || undefined,
                status: quickStatus || status || undefined,
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
        [searchValue, branchName, areaName, quickStatus, status, fromDate, toDate],
    );

    const resetFilters = useCallback(() => {
        setSearch("");
        setQuickFilter("all");
        setActiveFilters([]);
    }, []);

    const applyQuickFilter = useCallback((key: QuickFilterKey) => {
        setQuickFilter(key);
        setSearch("");
        setActiveFilters((current) =>
            current.filter((filter) => filter.field !== "status"),
        );
    }, []);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            loadData(null, true);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [
        searchValue,
        branchName,
        areaName,
        quickStatus,
        status,
        fromDate,
        toDate,
        loadData,
    ]);

    useEffect(() => {
        const handlePjumCreated = () => {
            loadData(null, true);
        };

        window.addEventListener("dashboard-pjum-created", handlePjumCreated);
        return () => {
            window.removeEventListener(
                "dashboard-pjum-created",
                handlePjumCreated,
            );
        };
    }, [loadData]);

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
                    {hasAnyActiveFilter ? (
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
                <div className="flex flex-wrap gap-2">
                    {QUICK_FILTERS.map((filter) => (
                        <Button
                            key={filter.key}
                            type="button"
                            variant={
                                quickFilter === filter.key
                                    ? "default"
                                    : "outline"
                            }
                            size="xs"
                            onClick={() => applyQuickFilter(filter.key)}
                        >
                            {filter.label}
                        </Button>
                    ))}
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
                    <Table scrollObserverRef={observerTarget} className="text-xs">
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
                                                prefetch={false}
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
                                            {item.areaNames.length > 0 ? (
                                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {item.areaNames.join(", ")}
                                                </div>
                                            ) : null}
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
                        <div className="h-5 min-w-5">
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
    const total = Math.max(summary.total, 0);
    const pendingPercent =
        total > 0 ? Math.round((summary.pendingReview / total) * 100) : 0;
    const approvedPercent =
        total > 0 ? Math.round((summary.approved / total) * 100) : 0;
    const stalePercent =
        total > 0 ? Math.round((summary.stalePending / total) * 100) : 0;
    const distribution = [
        {
            key: "pending",
            label: "Menunggu review",
            value: summary.pendingReview,
            percent: pendingPercent,
            className: "bg-amber-400",
            dotClassName: "bg-amber-400",
        },
        {
            key: "approved",
            label: "Disetujui",
            value: summary.approved,
            percent: approvedPercent,
            className: "bg-emerald-500",
            dotClassName: "bg-emerald-500",
        },
        {
            key: "stale",
            label: `Pending > ${summary.pendingStaleDays} hari`,
            value: summary.stalePending,
            percent: stalePercent,
            className: "bg-red-500",
            dotClassName: "bg-red-500",
        },
    ];
    const secondaryMetrics = [
        {
            label: "Menunggu Review",
            value: summary.pendingReview,
            helper: `${pendingPercent}% dari total PJUM`,
            icon: AlertTriangle,
            tone: "text-amber-700",
            bg: "bg-amber-50",
        },
        {
            label: "Disetujui",
            value: summary.approved,
            helper: `${approvedPercent}% selesai validasi`,
            icon: FileCheck2,
            tone: "text-emerald-700",
            bg: "bg-emerald-50",
        },
        {
            label: "Laporan Masuk PJUM",
            value: summary.reportCount,
            helper: "Total laporan masuk PJUM",
            icon: FileText,
            tone: "text-sky-700",
            bg: "bg-sky-50",
        },
        {
            label: "Pending Terlalu Lama",
            value: summary.stalePending,
            helper: `Melewati ${summary.pendingStaleDays} hari`,
            icon: AlertTriangle,
            tone: "text-red-700",
            bg: "bg-red-50",
        },
    ];

    return (
        <section className="rounded-lg border bg-white px-4 py-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.6fr)] lg:items-stretch">
                <div className="flex min-h-[142px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm text-muted-foreground">
                                Total PJUM
                            </div>
                            <div className="mt-1 text-4xl font-semibold tracking-tight text-slate-800">
                                {summary.total.toLocaleString("id-ID")}
                            </div>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                            <FileText className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                            {distribution.map((item) =>
                                item.value > 0 ? (
                                    <div
                                        key={item.key}
                                        className={item.className}
                                        style={{
                                            width: `${Math.max(item.percent, 5)}%`,
                                        }}
                                    />
                                ) : null,
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[11px] text-muted-foreground sm:grid-cols-3">
                            {distribution.map((item) => (
                                <div key={item.key} className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                "h-2 w-2 rounded-full",
                                                item.dotClassName,
                                            )}
                                        />
                                        <span className="truncate">
                                            {item.label}
                                        </span>
                                    </div>
                                    <div className="mt-1 font-medium text-slate-700">
                                        {item.value.toLocaleString("id-ID")}{" "}
                                        <span className="text-muted-foreground">
                                            ({item.percent}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {secondaryMetrics.map((item) => (
                        <div
                            key={item.label}
                            className="flex min-h-[92px] flex-col justify-between rounded-md border bg-background px-3 py-2.5"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="truncate text-[11px] text-muted-foreground">
                                        {item.label}
                                    </div>
                                    <div className="mt-1 text-2xl font-semibold leading-none tracking-tight">
                                        {item.value.toLocaleString("id-ID")}
                                    </div>
                                </div>
                                <div
                                    className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                                        item.bg,
                                    )}
                                >
                                    <item.icon
                                        className={cn("h-4 w-4", item.tone)}
                                    />
                                </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                {item.helper}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
