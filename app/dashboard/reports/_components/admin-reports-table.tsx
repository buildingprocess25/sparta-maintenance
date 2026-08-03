"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
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
    ArrowUpRight,
    Building2,
    CalendarDays,
    CircleDot,
    Loader2,
    ReceiptText,
    Search,
    Store,
} from "lucide-react";
import { getAdminReports, AdminReportFilters } from "../actions";
import { toast } from "sonner";
import { formatJakartaDate, formatJakartaDateTime } from "@/lib/time";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_OPTIONS } from "@/lib/report-status";
import { STORE_BRAND_OPTIONS, normalizeStoreBrandFilter } from "@/lib/store-brand-filter";
import {
    createFilter,
    Filters,
    type Filter,
    type FilterFieldConfig,
} from "@/components/reui/filters";

type ReportItem = Awaited<ReturnType<typeof getAdminReports>>["reports"][0];

const PJUM_OPTIONS = [
    { value: "exported", label: "Sudah PJUM" },
    { value: "not_exported", label: "Belum PJUM" },
];
const QUICK_FILTERS = [
    {
        key: "all",
        label: "Semua",
    },
    {
        key: "active",
        label: "Laporan aktif",
    },
    {
        key: "overdue",
        label: "Lewat SLA",
    },
    {
        key: "review_bmc",
        label: "Review BMC",
    },
    {
        key: "review_bnm",
        label: "Review BNM",
    },
    {
        key: "revision",
        label: "Revisi",
    },
    {
        key: "completed",
        label: "Selesai",
    },
    {
        key: "not_pjum",
        label: "Belum PJUM",
    },
] as const;

type QuickFilterKey = (typeof QUICK_FILTERS)[number]["key"];

function resolveInitialQuickFilter({
    initialScope,
    initialStatus,
    initialPjumStatus,
}: {
    initialScope: string;
    initialStatus: string;
    initialPjumStatus: string;
}): QuickFilterKey {
    if (QUICK_FILTERS.some((filter) => filter.key === initialScope)) {
        return initialScope as QuickFilterKey;
    }
    if (initialStatus === "COMPLETED" && initialPjumStatus === "not_exported") {
        return "not_pjum";
    }
    if (initialStatus === "COMPLETED") {
        return "completed";
    }
    return "all";
}

function formatRp(n: number | null | undefined) {
    if (n === null || n === undefined) return "-";
    return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatCompactDate(date: Date | string | null): string {
    if (!date) return "-";
    return formatJakartaDate(date);
}

function getPjumBadge(report: ReportItem) {
    if (report.pjumExportedAt) {
        return (
            <Badge
                variant="outline"
                className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700"
            >
                PJUM
            </Badge>
        );
    }

    if (report.status === "COMPLETED" && report.requiresPjum) {
        return (
            <Badge
                variant="outline"
                className="h-5 border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
            >
                Belum PJUM
            </Badge>
        );
    }

    if (report.status === "COMPLETED" && !report.requiresPjum) {
        return (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                Tidak perlu
            </Badge>
        );
    }

    return (
        <span className="text-xs text-muted-foreground">-</span>
    );
}

function getSlaBadge(report: ReportItem) {
    if (!report.slaDays) {
        return <span className="text-xs text-muted-foreground">-</span>;
    }

    return (
        <div className="flex items-center gap-1.5">
            <Badge
                variant="outline"
                className={
                    report.slaOverdue
                        ? "h-5 border-red-200 bg-red-50 px-1.5 text-[10px] font-medium text-red-700"
                        : "h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700"
                }
            >
                {report.slaOverdue ? "Lewat SLA" : "Aman"}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
                {report.slaAgeDays}/{report.slaDays} hari
            </span>
        </div>
    );
}

export function AdminReportsTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    areaNames,
    initialStatus = "all",
    initialScope = "all",
    initialPjumStatus = "all",
    initialBranchName = "all",
    initialAreaName = "all",
    initialBrand = "ALL",
    showBrandFilter = false,
}: {
    initialData: ReportItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    areaNames: string[];
    initialStatus?: string;
    initialScope?: string;
    initialPjumStatus?: string;
    initialBranchName?: string;
    initialAreaName?: string;
    initialBrand?: string;
    showBrandFilter?: boolean;
}) {
    const initialQuickFilter = resolveInitialQuickFilter({
        initialScope,
        initialStatus,
        initialPjumStatus,
    });
    const [reports, setReports] = useState<ReportItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [search, setSearch] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilterKey>(
        () => initialQuickFilter,
    );

    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(() =>
        [
            initialStatus === "all"
                ? null
                : initialQuickFilter !== "all"
                  ? null
                  : createFilter<string>("status", "is", [initialStatus]),
            initialPjumStatus === "all"
                ? null
                : initialQuickFilter !== "all"
                  ? null
                  : createFilter<string>("pjumStatus", "is", [
                        initialPjumStatus,
                    ]),
            !initialBranchName || initialBranchName === "all"
                ? null
                : createFilter<string>("branchName", "is", [initialBranchName]),
            !initialAreaName || initialAreaName === "all"
                ? null
                : createFilter<string>("areaName", "is", [initialAreaName]),
            showBrandFilter && normalizeStoreBrandFilter(initialBrand) !== "ALL"
                ? createFilter<string>("brand", "is", [normalizeStoreBrandFilter(initialBrand)])
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
            ...(showBrandFilter
                ? [{
                    key: "brand",
                    label: "Brand",
                    type: "select" as const,
                    placeholder: "Pilih brand",
                    icon: <Store className="h-3.5 w-3.5" />,
                    options: STORE_BRAND_OPTIONS,
                }]
                : []),
            {
                key: "status",
                label: "Status",
                type: "select",
                placeholder: "Pilih status",
                icon: <CircleDot className="h-3.5 w-3.5" />,
                options: REPORT_STATUS_OPTIONS,
            },
            {
                key: "pjumStatus",
                label: "PJUM",
                type: "select",
                placeholder: "Pilih PJUM",
                icon: <ReceiptText className="h-3.5 w-3.5" />,
                options: PJUM_OPTIONS,
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
        [branches, areaNames, showBrandFilter],
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
    const pjumStatus = String(getFilterValue("pjumStatus"));
    const brand = normalizeStoreBrandFilter(String(getFilterValue("brand")));
    const hasActiveFilter =
        searchValue.length > 0 ||
        activeFilters.length > 0 ||
        quickFilter !== "all";

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminReportFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
                areaName: areaName || undefined,
                status: status || undefined,
                brand: showBrandFilter && brand !== "ALL" ? brand : undefined,
                scope:
                    quickFilter !== "all" &&
                    quickFilter !== "completed" &&
                    quickFilter !== "not_pjum"
                        ? quickFilter
                        : undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                pjumStatus:
                    quickFilter === "not_pjum"
                        ? "not_exported"
                        : pjumStatus || undefined,
            };
            if (quickFilter === "completed" || quickFilter === "not_pjum") {
                filters.status = "COMPLETED";
            }

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminReports(cursor, 20, filters);

                if (isInitial) {
                    setReports(res.reports);
                    setTotalCount(res.totalCount);
                } else {
                    setReports((prev) => {
                        const existing = new Set(
                            prev.map((report) => report.reportNumber),
                        );
                        return [
                            ...prev,
                            ...res.reports.filter(
                                (report) => !existing.has(report.reportNumber),
                            ),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data laporan");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [
            searchValue,
            branchName,
            areaName,
            status,
            fromDate,
            toDate,
            pjumStatus,
            brand,
            showBrandFilter,
            quickFilter,
        ],
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
            current.filter(
                (filter) =>
                    filter.field !== "status" && filter.field !== "pjumStatus",
            ),
        );
    }, []);

    // Initial load when filters change (debounced for text inputs)
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
        status,
        fromDate,
        toDate,
        pjumStatus,
        brand,
        showBrandFilter,
        quickFilter,
        loadData,
    ]);

    // Intersection Observer for Infinite Scroll
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
            {/* Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="font-medium text-foreground">
                        {totalCount}
                    </span>{" "}
                    laporan sesuai filter
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

            <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((filter) => (
                    <Button
                        key={filter.key}
                        type="button"
                        variant={
                            quickFilter === filter.key ? "default" : "outline"
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
                        placeholder="Cari laporan, toko, BMS..."
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

            {/* Table */}
            <div className="overflow-hidden rounded-md border bg-white">
                <div className="overflow-x-auto">
                    <Table scrollObserverRef={observerTarget} className="text-[11px] [&_td]:py-2 [&_th]:h-8 [&_th]:py-1.5">
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="w-[120px] min-w-[120px]">
                                    Laporan
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    Update
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    Toko
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    BMS
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Biaya
                                </TableHead>
                                <TableHead className="min-w-[130px]">
                                    Status
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    PJUM
                                </TableHead>
                                <TableHead className="w-[130px]">SLA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !isFetchingNextPage ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada laporan yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow
                                        key={report.reportNumber}
                                        className={
                                            report.slaOverdue
                                                ? "bg-red-50/40 hover:bg-red-50/70"
                                                : "hover:bg-slate-50/70"
                                        }
                                    >
                                        <TableCell className="whitespace-nowrap align-middle">
                                            <Link
                                                prefetch={false}
                                                href={`/dashboard/reports/${report.reportNumber}`}
                                                className="inline-flex items-center gap-1 font-mono font-medium text-primary underline-offset-4 hover:underline"
                                            >
                                                {report.reportNumber}
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap align-middle text-muted-foreground">
                                            {formatJakartaDateTime(
                                                report.lastActivityAt
                                            )}
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <div className="max-w-[260px] truncate text-[11px] font-medium">
                                                {report.storeName}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                {report.storeCode ? (
                                                    <span className="font-mono">
                                                        {report.storeCode}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <div className="max-w-[140px] truncate text-[11px] font-medium">
                                                {report.branchName || "-"}
                                            </div>
                                            {report.areaName ? (
                                                <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-muted-foreground">
                                                    {report.areaName}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <div className="max-w-[180px] truncate text-[11px]">
                                                {report.createdBy.name}
                                            </div>
                                            <div className="font-mono text-[10px] text-muted-foreground">
                                                {report.createdByNIK}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <div className="grid grid-cols-[50px_minmax(0,1fr)] gap-x-2 gap-y-0.5">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Estimasi
                                                </span>
                                                <span className="text-right font-medium tabular-nums">
                                                    {formatRp(
                                                        report.totalEstimation,
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Realisasi
                                                </span>
                                                <span className="text-right font-medium tabular-nums">
                                                    {formatRp(report.totalReal)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <StatusBadge
                                                status={report.status}
                                            />
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            {getPjumBadge(report)}
                                            {report.pjumExportedAt ? (
                                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {formatCompactDate(
                                                        report.pjumExportedAt,
                                                    )}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            {getSlaBadge(report)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Infinite scroll loader */}
                <div className="h-10 flex items-center justify-center p-4">
                    {isFetchingNextPage && (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );
}
