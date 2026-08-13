"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, FileText, Loader2, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { BmsReportsMobile } from "./bms-reports-mobile";
import type { ReportData } from "./bms-reports-list";
import { getBmsReportsPaginatedAction } from "../actions/paginated";
import { useBmsMobileHeaderVisibility } from "@/components/bms-mobile/use-bms-mobile-header-visibility";
import { cn } from "@/lib/utils";
import type { DateRangeFilter } from "../actions/types";

type BmsMobileReportsListProps = {
  reports: ReportData[];
  total: number;
  totalPages: number;
  currentPage: number;
};

const DATE_OPTIONS = [
  { value: "all", label: "Semua Waktu" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "last_week", label: "Minggu Lalu" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "custom", label: "Custom Range Tanggal" },
];

const QUICK_FILTERS = [
  { value: "all", label: "Semua Laporan" },
  { value: "active", label: "Laporan Aktif" },
  { value: "needs_action", label: "Perlu Tindakan" },
  { value: "completed", label: "Selesai" },
];

export function BmsMobileReportsList({
  reports: initialReports,
  total: initialTotal,
  totalPages: initialTotalPages,
  currentPage,
}: BmsMobileReportsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status")?.toLowerCase() || "all",
  );
  const [dateRangeFilter, setDateRangeFilter] = useState(
    searchParams.get("dateRange") || "all",
  );
  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(searchParams.get("toDate") || "");

  // Infinite scroll states
  const [allReports, setAllReports] = useState<ReportData[]>(initialReports);
  const [page, setPage] = useState(currentPage);
  const [hasMore, setHasMore] = useState(currentPage < initialTotalPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = useBmsMobileHeaderVisibility();

  // Sync with initial props when URL changes
  useEffect(() => {
    setAllReports(initialReports);
    setPage(currentPage);
    setHasMore(currentPage < initialTotalPages);
  }, [initialReports, currentPage, initialTotalPages]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const pushParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.set("page", "1");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      pushParam({ search: term });
    }, 300);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    pushParam({ status });
  };

  const handleDateRangeChange = (range: string) => {
    setDateRangeFilter(range);
    if (range !== "custom") {
      setFromDate("");
      setToDate("");
      pushParam({ dateRange: range, fromDate: "", toDate: "" });
    } else {
      pushParam({ dateRange: range });
    }
  };

  const handleCustomDateChange = (type: "from" | "to", val: string) => {
    if (type === "from") setFromDate(val);
    else setToDate(val);

    const newFrom = type === "from" ? val : fromDate;
    const newTo = type === "to" ? val : toDate;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      pushParam({ dateRange: "custom", fromDate: newFrom, toDate: newTo });
    }, 500);
  };

  // Infinite scroll fetching
  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isPending) return;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;

      const ACTIVE_STATUSES = [
        "DRAFT",
        "PENDING_ESTIMATION",
        "PENDING_CHECKLIST_REVIEW",
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED_REVISION",
        "ESTIMATION_REJECTED",
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "APPROVED_BMC",
        "REVIEW_REJECTED_REVISION",
      ];

      const NEEDS_ACTION_STATUSES = [
        "ESTIMATION_APPROVED",
        "ESTIMATION_REJECTED_REVISION",
        "REVIEW_REJECTED_REVISION",
      ];

      const resolvedStatus =
        statusFilter === "all"
          ? undefined
          : statusFilter === "active"
            ? ACTIVE_STATUSES
            : statusFilter === "needs_action"
              ? NEEDS_ACTION_STATUSES
            : statusFilter === "completed"
              ? ["COMPLETED"]
              : undefined;

      const res = await getBmsReportsPaginatedAction({
        search: searchQuery,
        status: resolvedStatus,
        dateRange: dateRangeFilter as DateRangeFilter,
        fromDate,
        toDate,
        page: nextPage,
        limit: 10,
      });

      setAllReports((prev) => {
        const existing = new Set(prev.map((r) => r.reportNumber));
        const newItems = (res.reports as ReportData[]).filter(
          (r) => !existing.has(r.reportNumber),
        );
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setHasMore(nextPage < Math.ceil(res.total / 10));
    } catch (error) {
      console.error("Failed to fetch more reports", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    page,
    searchQuery,
    statusFilter,
    dateRangeFilter,
    fromDate,
    toDate,
    isPending,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchMore]);

  const activeDateLabel =
    DATE_OPTIONS.find((o) => o.value === dateRangeFilter)?.label ||
    "Semua Waktu";
  const hasFilters = dateRangeFilter !== "all" || searchQuery !== "";

  return (
    <div className="flex flex-col gap-0">
      {/* Sticky search + filter bar */}
      <div
        className={cn(
          "sticky z-20 bg-background/95 backdrop-blur shadow-sm py-3 -mx-4 px-4 flex flex-col gap-3 transition-[top] duration-300 ease-out border-b border-border/40",
          isHeaderVisible ? "top-14" : "top-0",
        )}
      >
        <div className="flex items-center gap-2 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="bms-report-search"
              placeholder="Cari laporan..."
              className="pl-8 h-9 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-md"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Cari laporan"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Periode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={dateRangeFilter !== "all" ? "default" : "outline"}
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Filter Periode"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Filter Periode
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={dateRangeFilter}
                onValueChange={handleDateRangeChange}
              >
                {DATE_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Custom Date Inputs */}
        {dateRangeFilter === "custom" && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-1 block">
                Dari
              </label>
              <Input
                type="date"
                className="h-8 text-[11px] w-full bg-muted/40 mt-1"
                value={fromDate}
                onChange={(e) => handleCustomDateChange("from", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold ml-1 block">
                Sampai
              </label>
              <Input
                type="date"
                className="h-8 text-[11px] w-full bg-muted/40 mt-1"
                value={toDate}
                onChange={(e) => handleCustomDateChange("to", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Radio Capsule (Status Filters) */}
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {QUICK_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <Button
                key={filter.value}
                type="button"
                variant={isActive ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "rounded-full h-7 px-3.5 text-[11px] font-medium transition-colors shrink-0",
                  !isActive &&
                    "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
                onClick={() => handleStatusChange(filter.value)}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Total count */}
      <p className="text-xs text-muted-foreground pt-3 px-1">
        {initialTotal} laporan{" "}
        {hasFilters && `sesuai filter (${activeDateLabel})`}
      </p>

      {/* Loading overlay */}
      <div className="relative mt-2">
        {isPending && (
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-md">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {allReports.length > 0 ? (
          <div className="-mx-4">
            <BmsReportsMobile reports={allReports} />

            {/* Infinite scroll loader */}
            <div
              ref={loaderRef}
              className="h-10 w-full flex items-center justify-center my-2"
            >
              {isLoadingMore && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ) : (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>Tidak ada laporan</EmptyTitle>
              <EmptyDescription>
                {searchQuery || hasFilters
                  ? "Coba ubah kata kunci atau periode."
                  : "Anda belum membuat laporan."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
