"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    Search,
    MapPin,
    Filter,
    FileText,
    CalendarDays,
    ArrowRight,
    Loader2,
    Check,
    X,
    Clock,
    Wrench,
    Building2,
    ChevronRight,
    User,
    RotateCcw,
} from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export type ApprovalReportData = {
    reportNumber: string;
    storeName: string;
    storeCode: string | null;
    branchName: string;
    status: string;
    totalEstimation: number;
    createdAt: Date;
    updatedAt: Date;
    finishedAt: Date | null;
    createdByName: string;
    completedPdfPath?: string | null;
    reportFinalDriveUrl?: string | null;
};

type Props = {
    reports: ApprovalReportData[];
    total: number;
    totalPages: number;
    currentPage: number;
    role: string;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "PENDING_ESTIMATION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-200 shadow-none"
                >
                    <Clock className="h-3 w-3" /> Menunggu Est.
                </Badge>
            );
        case "ESTIMATION_APPROVED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 shadow-none"
                >
                    <Check className="h-3 w-3" /> Estimasi Disetujui
                </Badge>
            );
        case "ESTIMATION_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 shadow-none"
                >
                    <X className="h-3 w-3" /> Est. Ditolak (Revisi)
                </Badge>
            );
        case "ESTIMATION_REJECTED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 shadow-none"
                >
                    <X className="h-3 w-3" /> Est. Ditolak
                </Badge>
            );
        case "IN_PROGRESS":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 shadow-none"
                >
                    <Wrench className="h-3 w-3" /> Sedang Dikerjakan
                </Badge>
            );
        case "PENDING_REVIEW":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200 shadow-none"
                >
                    <Clock className="h-3 w-3" /> Menunggu Review
                </Badge>
            );
        case "APPROVED_BMC":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-cyan-100 text-cyan-700 hover:bg-cyan-100/80 border-cyan-200 shadow-none"
                >
                    <Clock className="h-3 w-3" /> Menunggu Persetujuan Final
                </Badge>
            );
        case "REVIEW_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 shadow-none"
                >
                    <X className="h-3 w-3" /> Review Ditolak (Revisi)
                </Badge>
            );
        case "COMPLETED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-none"
                >
                    <Check className="h-3 w-3" /> Selesai
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

const getActionLabel = (status: string, role: string): string => {
    switch (status) {
        case "PENDING_ESTIMATION":
            return "Review Estimasi";
        case "PENDING_REVIEW":
            return "Review Pekerjaan";
        case "APPROVED_BMC":
            return role === "BNM_MANAGER" ? "Review Final" : "Lihat";
        default:
            return "Lihat";
    }
};

export function ApprovalReportsList({
    reports,
    total,
    totalPages,
    currentPage,
    role,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || "",
    );
    const [bmsQuery, setBmsQuery] = useState(searchParams.get("bms") || "");
    const [statusFilter, setStatusFilter] = useState(
        searchParams.get("status")?.toLowerCase() || "all",
    );
    const [dateRangeFilter, setDateRangeFilter] = useState(
        searchParams.get("dateRange") || "all",
    );

    // Debounce refs — avoid triggering navigation on every keystroke
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const bmsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceRef.current)
                clearTimeout(searchDebounceRef.current);
            if (bmsDebounceRef.current) clearTimeout(bmsDebounceRef.current);
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
            startTransition(() =>
                router.replace(`${pathname}?${params.toString()}`),
            );
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

    const handleBmsSearch = (term: string) => {
        setBmsQuery(term);
        if (bmsDebounceRef.current) clearTimeout(bmsDebounceRef.current);
        bmsDebounceRef.current = setTimeout(() => {
            pushParam({ bms: term });
        }, 300);
    };

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        pushParam({ status });
    };

    const handleDateRangeChange = (range: string) => {
        setDateRangeFilter(range);
        pushParam({ dateRange: range });
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        startTransition(() =>
            router.replace(`${pathname}?${params.toString()}`),
        );
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setBmsQuery("");
        setStatusFilter("all");
        setDateRangeFilter("all");
        startTransition(() => router.replace(pathname));
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    const formatCurrency = (amount: number) =>
        `Rp ${Number(amount).toLocaleString("id-ID")}`;

    const pageTitle =
        role === "BNM_MANAGER"
            ? "Persetujuan Final"
            : role === "ADMIN"
              ? "Semua Laporan"
              : "Laporan Cabang";

    const pageDescription =
        role === "BNM_MANAGER"
            ? "Laporan yang menunggu persetujuan final dan riwayat laporan wilayah Anda"
            : role === "BMC"
              ? "Laporan dari toko-toko di cabang Anda"
              : "Semua laporan";

    // Determine which filters are active (for chips display)
    const hasActiveFilters =
        searchQuery ||
        bmsQuery ||
        statusFilter !== "all" ||
        dateRangeFilter !== "all";

    const STATUS_LABEL: Record<string, string> = {
        pending_estimation: "Menunggu Est.",
        estimation_approved: "Estimasi Disetujui",
        estimation_rejected_revision: "Est. Ditolak (Revisi)",
        estimation_rejected: "Est. Ditolak",
        in_progress: "Sedang Dikerjakan",
        pending_review: "Menunggu Review",
        approved_bmc: "Menunggu Final BNM",
        review_rejected_revision: "Review Ditolak (Revisi)",
        completed: "Selesai",
        view_all: "Semua Status",
    };

    const DATE_LABEL: Record<string, string> = {
        this_month: "Bulan Ini",
        last_month: "Bulan Lalu",
        last_3_months: "3 Bulan Terakhir",
        last_6_months: "6 Bulan Terakhir",
        this_year: "Tahun Ini",
        last_year: "Tahun Lalu",
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title={pageTitle}
                description={pageDescription}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-4">
                {/* Filter Bar */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-2 md:items-center">
                        {/* Search: no. laporan / toko / kode toko */}
                        <div className="relative flex-1 min-w-0 md:max-w-sm">
                            <label
                                htmlFor="approval-search"
                                className="sr-only"
                            >
                                Cari laporan
                            </label>
                            <Search
                                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="approval-search"
                                placeholder="Cari no. laporan, toko, kode toko..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => handleSearch("")}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    aria-label="Hapus pencarian"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter by BMS name */}
                        <div className="relative flex-1 min-w-0 md:max-w-xs">
                            <label htmlFor="bms-search" className="sr-only">
                                Cari BMS
                            </label>
                            <User
                                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="bms-search"
                                placeholder="Cari nama BMS..."
                                className="pl-9 bg-background"
                                value={bmsQuery}
                                onChange={(e) =>
                                    handleBmsSearch(e.target.value)
                                }
                            />
                            {bmsQuery && (
                                <button
                                    type="button"
                                    onClick={() => handleBmsSearch("")}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    aria-label="Hapus filter BMS"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Status filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger
                                className="w-auto bg-background"
                                aria-label="Filter berdasarkan status"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter
                                        className="h-4 w-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Antrian Approval
                                </SelectItem>
                                <SelectItem value="view_all">
                                    Semua Status
                                </SelectItem>
                                {role !== "BNM_MANAGER" && (
                                    <>
                                        <SelectItem value="pending_estimation">
                                            Menunggu Persetujuan Estimasi
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                            Sedang Dikerjakan
                                        </SelectItem>
                                        <SelectItem value="pending_review">
                                            Menunggu Review Penyelesaian
                                        </SelectItem>
                                        <SelectItem value="approved_bmc">
                                            Menunggu Persetujuan Final BNM
                                        </SelectItem>
                                    </>
                                )}
                                {role === "BNM_MANAGER" && (
                                    <SelectItem value="approved_bmc">
                                        Menunggu Persetujuan Final BNM
                                    </SelectItem>
                                )}
                                <SelectItem value="completed">
                                    Selesai
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date range filter */}
                        <Select
                            value={dateRangeFilter}
                            onValueChange={handleDateRangeChange}
                        >
                            <SelectTrigger
                                className="w-auto bg-background"
                                aria-label="Filter berdasarkan periode waktu"
                            >
                                <div className="flex items-center gap-2">
                                    <CalendarDays
                                        className="h-4 w-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <SelectValue placeholder="Periode" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Waktu</SelectItem>
                                <SelectItem value="this_month">
                                    Bulan Ini
                                </SelectItem>
                                <SelectItem value="last_month">
                                    Bulan Lalu
                                </SelectItem>
                                <SelectItem value="last_3_months">
                                    3 Bulan Terakhir
                                </SelectItem>
                                <SelectItem value="last_6_months">
                                    6 Bulan Terakhir
                                </SelectItem>
                                <SelectItem value="this_year">
                                    Tahun Ini
                                </SelectItem>
                                <SelectItem value="last_year">
                                    Tahun Lalu
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Result count */}
                    <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                            ? `Menampilkan ${reports.length} dari ${total} laporan`
                            : `${total} laporan`}
                    </p>
                </div>

                {reports.length > 0 ? (
                    <>
                        {/* --- MOBILE VIEW: LIST --- */}
                        <div className="relative md:hidden">
                            {isPending && (
                                <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center rounded-xl">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <div className="rounded-xl border overflow-hidden divide-y bg-card shadow-sm">
                                {reports.map((report) => {
                                    const statusBar: Record<string, string> = {
                                        PENDING_ESTIMATION: "bg-yellow-400",
                                        ESTIMATION_APPROVED: "bg-green-500",
                                        ESTIMATION_REJECTED_REVISION:
                                            "bg-orange-500",
                                        ESTIMATION_REJECTED: "bg-red-500",
                                        IN_PROGRESS: "bg-blue-500",
                                        PENDING_REVIEW: "bg-purple-500",
                                        APPROVED_BMC: "bg-cyan-500",
                                        REVIEW_REJECTED_REVISION:
                                            "bg-orange-500",
                                        COMPLETED: "bg-emerald-500",
                                    };
                                    const statusBadge: Record<string, string> =
                                        {
                                            PENDING_ESTIMATION:
                                                "bg-yellow-100 text-yellow-700",
                                            ESTIMATION_APPROVED:
                                                "bg-green-100 text-green-700",
                                            ESTIMATION_REJECTED_REVISION:
                                                "bg-orange-100 text-orange-700",
                                            ESTIMATION_REJECTED:
                                                "bg-red-100 text-red-700",
                                            IN_PROGRESS:
                                                "bg-blue-100 text-blue-700",
                                            PENDING_REVIEW:
                                                "bg-purple-100 text-purple-700",
                                            APPROVED_BMC:
                                                "bg-cyan-100 text-cyan-700",
                                            REVIEW_REJECTED_REVISION:
                                                "bg-orange-100 text-orange-700",
                                            COMPLETED:
                                                "bg-emerald-100 text-emerald-700",
                                        };
                                    const statusLabel: Record<string, string> =
                                        {
                                            PENDING_ESTIMATION:
                                                "Menunggu Est. Estimasi",
                                            ESTIMATION_APPROVED:
                                                "Estimasi Disetujui",
                                            ESTIMATION_REJECTED_REVISION:
                                                "Est. Ditolak (Revisi)",
                                            ESTIMATION_REJECTED: "Est. Ditolak",
                                            IN_PROGRESS: "Sedang Dikerjakan",
                                            PENDING_REVIEW: "Menunggu Review",
                                            APPROVED_BMC: "Menunggu Final BNM",
                                            REVIEW_REJECTED_REVISION:
                                                "Review Ditolak (Revisi)",
                                            COMPLETED: "Selesai",
                                        };
                                    const barColor =
                                        statusBar[report.status] ?? "bg-muted";
                                    const badgeColor =
                                        statusBadge[report.status] ??
                                        "bg-muted text-muted-foreground";
                                    const label =
                                        statusLabel[report.status] ??
                                        report.status;
                                    const estFormatted = report.totalEstimation
                                        ? `Rp ${Number(report.totalEstimation).toLocaleString("id-ID")}`
                                        : null;

                                    return (
                                        <div
                                            key={report.reportNumber}
                                            className="flex items-stretch hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer"
                                            onClick={() => {
                                                if (report.status === "COMPLETED" && (report.reportFinalDriveUrl || report.completedPdfPath)) {
                                                    window.open(report.reportFinalDriveUrl || report.completedPdfPath || "", "_blank", "noopener,noreferrer");
                                                } else {
                                                    router.push(`/reports/${report.reportNumber}`);
                                                }
                                            }}
                                        >
                                            <span
                                                className={`w-1 shrink-0 ${barColor}`}
                                            />
                                            <div className="flex-1 min-w-0 px-3 py-3">
                                                {/* Row 1: store code + name */}
                                                <p className="font-semibold text-sm leading-tight truncate mb-1">
                                                    {report.storeCode
                                                        ? `${report.storeCode} \u2013 ${report.storeName || "\u2014"}`
                                                        : report.storeName ||
                                                          "\u2014"}
                                                </p>
                                                {/* Row 2: status badge */}
                                                <span
                                                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap mb-2 ${badgeColor}`}
                                                >
                                                    {label}
                                                </span>
                                                {/* Row 3: report number + branch */}
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                                                    <span className="font-mono shrink-0">
                                                        {report.reportNumber}
                                                    </span>
                                                    <span className="flex items-center gap-1 min-w-0">
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {report.branchName}
                                                        </span>
                                                    </span>
                                                </div>
                                                {/* Row 4: BMS name + date + estimation */}
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3 shrink-0" />
                                                        {report.createdByName}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3 shrink-0" />
                                                        {formatDate(
                                                            report.updatedAt,
                                                        )}
                                                    </span>
                                                    {estFormatted && (
                                                        <span className="font-medium text-foreground">
                                                            {estFormatted}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center pr-3 text-muted-foreground/40">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- DESKTOP VIEW: DATA TABLE --- */}
                        <div className="hidden md:block border rounded-lg shadow-sm bg-card relative">
                            {isPending && (
                                <div className="absolute inset-x-0 bottom-0 top-12 bg-background z-50 flex items-center justify-center rounded-b-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="w-25">
                                            Nomor Laporan
                                        </TableHead>
                                        <TableHead className="min-w-50">
                                            Toko &amp; Cabang
                                        </TableHead>
                                        <TableHead>BMS</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Selesai</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Estimasi
                                        </TableHead>
                                        <TableHead className="w-17.5 text-center">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.map((report) => (
                                        <TableRow
                                            key={report.reportNumber}
                                            className="group cursor-pointer"
                                            onClick={() => {
                                                if (report.status === "COMPLETED" && (report.reportFinalDriveUrl || report.completedPdfPath)) {
                                                    window.open(report.reportFinalDriveUrl || report.completedPdfPath || "", "_blank", "noopener,noreferrer");
                                                } else {
                                                    router.push(`/reports/${report.reportNumber}`);
                                                }
                                            }}
                                        >
                                            <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                                {report.reportNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">
                                                        {report.storeCode
                                                            ? `${report.storeCode} – `
                                                            : ""}
                                                        {report.storeName ||
                                                            "—"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />{" "}
                                                        {report.branchName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {report.createdByName}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(report.updatedAt)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {report.finishedAt
                                                    ? formatDate(
                                                          report.finishedAt,
                                                      )
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(report.status)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatCurrency(
                                                    report.totalEstimation,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {report.status === "COMPLETED" && (report.reportFinalDriveUrl || report.completedPdfPath) ? (
                                                    <a href={report.reportFinalDriveUrl || report.completedPdfPath || ""} target="_blank" rel="noopener noreferrer">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 px-2.5 text-muted-foreground"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                            {getActionLabel(report.status, role)}
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1.5 px-2.5 text-muted-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/reports/${report.reportNumber}`);
                                                        }}
                                                    >
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                        {getActionLabel(report.status, role)}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="relative flex items-center justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (currentPage > 1)
                                                        handlePageChange(
                                                            currentPage - 1,
                                                        );
                                                }}
                                                className={
                                                    currentPage <= 1
                                                        ? "pointer-events-none opacity-50"
                                                        : "cursor-pointer"
                                                }
                                            />
                                        </PaginationItem>

                                        {Array.from({
                                            length: totalPages,
                                        }).map((_, i) => {
                                            const page = i + 1;
                                            if (
                                                totalPages <= 7 ||
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 &&
                                                    page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={
                                                                page ===
                                                                currentPage
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(
                                                                    page,
                                                                );
                                                            }}
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            } else if (
                                                (page === currentPage - 2 &&
                                                    currentPage > 3) ||
                                                (page === currentPage + 2 &&
                                                    currentPage <
                                                        totalPages - 2)
                                            ) {
                                                return (
                                                    <PaginationItem
                                                        key={`ellipsis-${page}`}
                                                    >
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                );
                                            }
                                            return null;
                                        })}

                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (
                                                        currentPage < totalPages
                                                    )
                                                        handlePageChange(
                                                            currentPage + 1,
                                                        );
                                                }}
                                                className={
                                                    currentPage >= totalPages
                                                        ? "pointer-events-none opacity-50"
                                                        : "cursor-pointer"
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>

                                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    Total {total} laporan
                                </div>
                                <div className="md:hidden mt-4 text-center text-xs text-muted-foreground w-full">
                                    Total {total} laporan
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty State */
                    <div className="bg-card border rounded-lg border-dashed">
                        <Empty className="py-16">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>
                                    Tidak ada laporan ditemukan
                                </EmptyTitle>
                                <EmptyDescription>
                                    {hasActiveFilters
                                        ? "Coba ubah atau reset filter pencarian Anda."
                                        : "Tidak ada laporan yang cocok dengan filter yang dipilih."}
                                </EmptyDescription>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 gap-1.5"
                                        onClick={handleResetFilters}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset Filter
                                    </Button>
                                )}
                            </EmptyHeader>
                        </Empty>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
