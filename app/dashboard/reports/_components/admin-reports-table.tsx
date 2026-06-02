"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    Building2,
    CalendarDays,
    CircleDot,
    Loader2,
    ReceiptText,
    Search,
} from "lucide-react";
import {
    getAdminReports,
    AdminReportFilters,
} from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_OPTIONS } from "@/lib/report-status";
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

function formatRp(n: number | null | undefined) {
    if (n === null || n === undefined) return "-";
    return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatCompactDate(date: Date | string | null): string {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function getPjumBadge(report: ReportItem) {
    if (report.pjumExportedAt) {
        return (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Sudah PJUM
            </Badge>
        );
    }

    if (report.status === "COMPLETED") {
        return (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                Belum PJUM
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
            Belum eligible
        </Badge>
    );
}

export function AdminReportsTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    initialStatus = "all",
    initialPjumStatus = "all",
    initialBranchName = "all",
}: {
    initialData: ReportItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    initialStatus?: string;
    initialPjumStatus?: string;
    initialBranchName?: string;
}) {
    const [reports, setReports] = useState<ReportItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [search, setSearch] = useState("");

    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>(() =>
        [
            initialStatus === "all"
                ? null
                : createFilter<string>("status", "is", [initialStatus]),
            initialPjumStatus === "all"
                ? null
                : createFilter<string>("pjumStatus", "is", [initialPjumStatus]),
            !initialBranchName || initialBranchName === "all"
                ? null
                : createFilter<string>("branchName", "is", [initialBranchName]),
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
        [branches],
    );

    const getFilterValue = useCallback(
        (key: string) =>
            activeFilters.find((filter) => filter.field === key)?.values[0] ?? "",
        [activeFilters],
    );

    const searchValue = search.trim();
    const branchName = String(getFilterValue("branchName"));
    const status = String(getFilterValue("status"));
    const fromDate = String(getFilterValue("fromDate"));
    const toDate = String(getFilterValue("toDate"));
    const pjumStatus = String(getFilterValue("pjumStatus"));
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const openReportDetail = useCallback(
        (reportNumber: string) => {
            window.location.assign(`/dashboard/reports/${reportNumber}`);
        },
        [],
    );

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminReportFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
                status: status || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                pjumStatus: pjumStatus || undefined,
            };

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
            status,
            fromDate,
            toDate,
            pjumStatus,
        ],
    );

    const resetFilters = useCallback(() => {
        setSearch("");
        setActiveFilters([]);
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
        status,
        fromDate,
        toDate,
        pjumStatus,
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
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="text-xs [&_td]:py-2 [&_th]:py-2">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[120px]">
                                    Aktivitas Terakhir
                                </TableHead>
                                <TableHead className="min-w-[100px]">
                                    No. Laporan
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Toko
                                </TableHead>
                                <TableHead>Cabang</TableHead>
                                <TableHead>BMS</TableHead>
                                <TableHead>Estimasi</TableHead>
                                <TableHead>Realisasi</TableHead>
                                <TableHead className="w-[130px]">
                                    PJUM
                                </TableHead>
                                <TableHead className="w-[140px]">
                                    Status
                                </TableHead>
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
                                        role="link"
                                        tabIndex={0}
                                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        onClick={() =>
                                            openReportDetail(
                                                report.reportNumber,
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                openReportDetail(
                                                    report.reportNumber,
                                                );
                                            }
                                        }}
                                    >
                                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                                            {format(
                                                new Date(report.updatedAt),
                                                "dd MMM yyyy",
                                                { locale: id },
                                            )}
                                            <div className="text-[10px]">
                                                {format(
                                                    new Date(report.updatedAt),
                                                    "HH:mm",
                                                    { locale: id },
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {report.reportNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-xs">
                                                {report.storeName}
                                            </div>
                                            {report.storeCode && (
                                                <div className="text-xs text-muted-foreground">
                                                    {report.storeCode}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {report.branchName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                {report.createdBy.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {report.createdByNIK}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatRp(report.totalEstimation)}
                                        </TableCell>
                                        <TableCell>
                                            {formatRp(report.totalReal)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {getPjumBadge(report)}
                                                {report.pjumExportedAt && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {formatCompactDate(
                                                            report.pjumExportedAt,
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={report.status}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Infinite scroll trigger */}
                <div
                    ref={observerTarget}
                    className="h-10 flex items-center justify-center p-4"
                >
                    {isFetchingNextPage && (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                </div>
            </div>

        </div>
    );
}
