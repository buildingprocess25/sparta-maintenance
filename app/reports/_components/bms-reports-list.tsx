"use client";

import { useState, useTransition } from "react";
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
import React from "react";
import {
    Search,
    Plus,
    MapPin,
    Filter,
    FileText,
    Clock,
    X,
    Check,
    Eye,
    Pencil,
    FileEdit,
    Loader2,
    CalendarDays,
    Wrench,
} from "lucide-react";
import Link from "next/link";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { BmsReportsMobile } from "./bms-reports-mobile";

// Type for report data from server
export type ReportData = {
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    totalEstimation: number;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        items: number;
    };
};

type BmsReportsListProps = {
    reports: ReportData[];
    total: number;
    totalPages: number;
    currentPage: number;
};

export default function BmsReportsList({
    reports,
    total,
    totalPages,
    currentPage,
}: BmsReportsListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Initialize state from URL params
    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || "",
    );
    const [statusFilter, setStatusFilter] = useState(
        searchParams.get("status")?.toLowerCase() || "all",
    );
    const [dateRangeFilter, setDateRangeFilter] = useState(
        searchParams.get("dateRange") || "all",
    );

    // Debounce search update
    const handleSearch = (term: string) => {
        setSearchQuery(term);
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        params.set("page", "1"); // Reset to page 1 on search
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    // Handle status filter change
    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        const params = new URLSearchParams(searchParams.toString());
        if (status && status !== "all") {
            params.set("status", status);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    // Handle date range filter change
    const handleDateRangeChange = (range: string) => {
        setDateRangeFilter(range);
        const params = new URLSearchParams(searchParams.toString());
        if (range && range !== "all") {
            params.set("dateRange", range);
        } else {
            params.delete("dateRange");
        }
        params.set("page", "1");
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    // Handle pagination
    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DRAFT":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200 shadow-none"
                    >
                        <FileEdit className="h-3 w-3" /> Draft
                    </Badge>
                );
            case "PENDING_ESTIMATION":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-200 shadow-none"
                    >
                        <Clock className="h-3 w-3" /> Menunggu Persetujuan
                        Estimasi
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
                        <X className="h-3 w-3" /> Estimasi Ditolak (Revisi)
                    </Badge>
                );
            case "ESTIMATION_REJECTED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 shadow-none"
                    >
                        <X className="h-3 w-3" /> Estimasi Ditolak
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
                        Penyelesaian
                    </Badge>
                );
            case "REVIEW_REJECTED_REVISION":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 shadow-none"
                    >
                        <X className="h-3 w-3" /> Ditolak (Revisi)
                    </Badge>
                );
            case "APPROVED_BMC":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-teal-100 text-teal-700 hover:bg-teal-100/80 border-teal-200 shadow-none"
                    >
                        <Check className="h-3 w-3" /> Penyelesaian Disetujui
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

    const ACTION_CONFIG: Record<
        string,
        { label: string; icon: React.ReactNode; cta: boolean }
    > = {
        DRAFT: {
            label: "Lanjutkan",
            icon: <Pencil className="h-3.5 w-3.5" />,
            cta: true,
        },
        PENDING_ESTIMATION: {
            label: "Lihat",
            icon: <Eye className="h-3.5 w-3.5" />,
            cta: false,
        },
        ESTIMATION_APPROVED: {
            label: "Mulai Pekerjaan",
            icon: <Wrench className="h-3.5 w-3.5" />,
            cta: true,
        },
        ESTIMATION_REJECTED_REVISION: {
            label: "Revisi",
            icon: <Pencil className="h-3.5 w-3.5" />,
            cta: true,
        },
        ESTIMATION_REJECTED: {
            label: "Lihat",
            icon: <Eye className="h-3.5 w-3.5" />,
            cta: false,
        },
        IN_PROGRESS: {
            label: "Selesaikan",
            icon: <Check className="h-3.5 w-3.5" />,
            cta: true,
        },
        PENDING_REVIEW: {
            label: "Lihat",
            icon: <Eye className="h-3.5 w-3.5" />,
            cta: false,
        },
        REVIEW_REJECTED_REVISION: {
            label: "Revisi",
            icon: <Pencil className="h-3.5 w-3.5" />,
            cta: true,
        },
        APPROVED_BMC: {
            label: "Lihat",
            icon: <Eye className="h-3.5 w-3.5" />,
            cta: false,
        },
        COMPLETED: {
            label: "Lihat",
            icon: <Eye className="h-3.5 w-3.5" />,
            cta: false,
        },
    };

    const getActionButton = (report: ReportData) => {
        const cfg = ACTION_CONFIG[report.status];
        if (!cfg) return null;
        return (
            <Button
                variant={cfg.cta ? "outline" : "ghost"}
                size="sm"
                className={`h-7 text-xs gap-1.5 px-2.5 ${
                    cfg.cta
                        ? "border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
                        : "text-muted-foreground"
                }`}
                onClick={(e) => e.stopPropagation()}
                asChild
            >
                <Link
                    href={
                        report.status === "ESTIMATION_REJECTED_REVISION" ||
                        report.status === "REVIEW_REJECTED_REVISION"
                            ? `/reports/revisi/${report.reportNumber}`
                            : `/reports/${report.reportNumber}`
                    }
                >
                    {cfg.icon}
                    {cfg.label}
                </Link>
            </Button>
        );
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${Number(amount).toLocaleString("id-ID")}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Laporan Saya"
                description={`${total} laporan — Kelola dan pantau status laporan kerusakan`}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar: Search, Filter, Create */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-1 gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-48 md:max-w-sm">
                            <label htmlFor="report-search" className="sr-only">
                                Cari laporan
                            </label>
                            <Search
                                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="report-search"
                                placeholder="Cari toko atau nomor laporan..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
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
                                    Semua Status
                                </SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending_estimation">
                                    Menunggu Persetujuan Estimasi
                                </SelectItem>
                                <SelectItem value="estimation_approved">
                                    Estimasi Disetujui
                                </SelectItem>
                                <SelectItem value="estimation_rejected_revision">
                                    Estimasi Ditolak (Revisi)
                                </SelectItem>
                                <SelectItem value="estimation_rejected">
                                    Estimasi Ditolak
                                </SelectItem>
                                <SelectItem value="in_progress">
                                    Sedang Dikerjakan
                                </SelectItem>
                                <SelectItem value="pending_review">
                                    Menunggu Review Penyelesaian
                                </SelectItem>
                                <SelectItem value="review_rejected_revision">
                                    Ditolak (Revisi)
                                </SelectItem>
                                <SelectItem value="approved_bmc">
                                    Penyelesaian Disetujui
                                </SelectItem>
                                <SelectItem value="completed">
                                    Selesai
                                </SelectItem>
                            </SelectContent>
                        </Select>
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

                    <Button
                        onClick={() => router.push("/reports/create")}
                        className="w-full md:w-auto gap-2 shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden md:inline">Buat Laporan</span>
                        <span className="md:hidden">Laporan Baru</span>
                    </Button>
                </div>

                {reports.length > 0 ? (
                    <>
                        {/* --- MOBILE VIEW: CARD LIST --- */}
                        <div className="relative md:hidden">
                            {isPending && (
                                <div className="absolute inset-0 bg-background z-50 flex items-center justify-center rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <BmsReportsMobile reports={reports} />
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
                                            Toko & Cabang
                                        </TableHead>
                                        <TableHead>Tanggal</TableHead>
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
                                            onClick={() =>
                                                router.push(
                                                    `/reports/${report.reportNumber}`,
                                                )
                                            }
                                        >
                                            <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                                {report.status === "DRAFT"
                                                    ? "DRAFT"
                                                    : report.reportNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">
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
                                                {formatDate(report.createdAt)}
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
                                                {getActionButton(report)}
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

                                        {Array.from({ length: totalPages }).map(
                                            (_, i) => {
                                                const page = i + 1;
                                                if (
                                                    totalPages <= 7 ||
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 &&
                                                        page <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <PaginationItem
                                                            key={page}
                                                        >
                                                            <PaginationLink
                                                                href="#"
                                                                isActive={
                                                                    page ===
                                                                    currentPage
                                                                }
                                                                onClick={(
                                                                    e,
                                                                ) => {
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
                                            },
                                        )}

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
                                    {searchQuery
                                        ? "Coba ubah kata kunci pencarian atau filter Anda."
                                        : "Anda belum membuat laporan kerusakan apapun."}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
