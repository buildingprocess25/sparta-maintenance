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
import {
    Search,
    MapPin,
    Filter,
    ClipboardCheck,
    ArrowRight,
    Loader2,
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
import type { ActivityItem } from "@/app/dashboard/queries";

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
    ESTIMATION_APPROVED: {
        label: "Estimasi disetujui",
        color: "bg-green-100 text-green-700 border-green-200",
    },
    ESTIMATION_REJECTED_REVISION: {
        label: "Estimasi ditolak (revisi)",
        color: "bg-orange-100 text-orange-700 border-orange-200",
    },
    ESTIMATION_REJECTED: {
        label: "Estimasi ditolak",
        color: "bg-red-100 text-red-700 border-red-200",
    },
    WORK_APPROVED: {
        label: "Penyelesaian disetujui",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    WORK_REJECTED_REVISION: {
        label: "Penyelesaian ditolak (revisi)",
        color: "bg-red-100 text-red-700 border-red-200",
    },
};

type Props = {
    activities: ActivityItem[];
    total: number;
    totalPages: number;
    currentPage: number;
};

export function BmcHistoryList({
    activities,
    total,
    totalPages,
    currentPage,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || "",
    );
    const [actionFilter, setActionFilter] = useState(
        searchParams.get("action") || "all",
    );

    const pushParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set("page", "1");
        startTransition(() =>
            router.replace(`${pathname}?${params.toString()}`),
        );
    };

    const handleSearch = (term: string) => {
        setSearchQuery(term);
        pushParam("search", term);
    };

    const handleActionChange = (action: string) => {
        setActionFilter(action);
        pushParam("action", action);
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", page.toString());
        startTransition(() =>
            router.replace(`${pathname}?${params.toString()}`),
        );
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const getActionBadge = (action: string) => {
        const cfg = ACTION_CONFIG[action] ?? {
            label: action,
            color: "bg-muted text-muted-foreground border-border",
        };
        return (
            <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 border whitespace-nowrap ${cfg.color}`}
            >
                {cfg.label}
            </Badge>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Riwayat Approval"
                description={`${total} keputusan`}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar: Search + Filter */}
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative flex-1 min-w-48 md:max-w-sm">
                        <label htmlFor="history-search" className="sr-only">
                            Cari riwayat
                        </label>
                        <Search
                            className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            id="history-search"
                            placeholder="Cari nomor laporan atau nama toko..."
                            className="pl-9 bg-background"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <Select
                        value={actionFilter}
                        onValueChange={handleActionChange}
                    >
                        <SelectTrigger
                            className="w-auto bg-background"
                            aria-label="Filter berdasarkan jenis keputusan"
                        >
                            <div className="flex items-center gap-2">
                                <Filter
                                    className="h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <SelectValue placeholder="Jenis Keputusan" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Keputusan</SelectItem>
                            <SelectItem value="ESTIMATION_APPROVED">
                                Estimasi disetujui
                            </SelectItem>
                            <SelectItem value="ESTIMATION_REJECTED_REVISION">
                                Estimasi ditolak (revisi)
                            </SelectItem>
                            <SelectItem value="ESTIMATION_REJECTED">
                                Estimasi ditolak
                            </SelectItem>
                            <SelectItem value="WORK_APPROVED">
                                Penyelesaian disetujui
                            </SelectItem>
                            <SelectItem value="WORK_REJECTED_REVISION">
                                Penyelesaian ditolak (revisi)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {activities.length > 0 ? (
                    <>
                        {/* --- MOBILE VIEW: CARD LIST --- */}
                        <div className="relative md:hidden">
                            {isPending && (
                                <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <div className="space-y-3">
                                {activities.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-card border rounded-lg shadow-sm p-4 space-y-3 cursor-pointer"
                                        onClick={() => {
                                            const isCompleted = item.report.status === "COMPLETED";
                                            const driveUrl = item.report.reportFinalDriveUrl || item.report.completedPdfPath;
                                            if (isCompleted && driveUrl) {
                                                window.open(driveUrl, "_blank", "noopener,noreferrer");
                                            } else {
                                                router.push(`/reports/${item.reportNumber}`);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-mono font-semibold text-xs text-muted-foreground">
                                                    {item.reportNumber}
                                                </p>
                                                <p className="text-sm font-medium mt-0.5 truncate">
                                                    {item.report.storeName ||
                                                        "—"}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {item.report.branchName}
                                                </p>
                                            </div>
                                        </div>
                                        <div>{getActionBadge(item.action)}</div>
                                        {item.notes && (
                                            <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                                                {item.notes}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(item.createdAt)}
                                            </span>
                                            {item.report.status === "COMPLETED" && (item.report.reportFinalDriveUrl || item.report.completedPdfPath) ? (
                                                <a href={item.report.reportFinalDriveUrl || item.report.completedPdfPath || ""} target="_blank" rel="noopener noreferrer">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 h-8"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Lihat
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Button>
                                                </a>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 h-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/reports/${item.reportNumber}`);
                                                    }}
                                                >
                                                    Lihat
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- DESKTOP VIEW: DATA TABLE --- */}
                        <div className="hidden md:block border rounded-lg shadow-sm bg-card relative">
                            {isPending && (
                                <div className="absolute inset-x-0 bottom-0 top-12 bg-background/80 z-50 flex items-center justify-center rounded-b-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="w-28">
                                            Nomor Laporan
                                        </TableHead>
                                        <TableHead className="min-w-44">
                                            Toko & Cabang
                                        </TableHead>
                                        <TableHead className="min-w-52">
                                            Keputusan
                                        </TableHead>
                                        <TableHead>Catatan</TableHead>
                                        <TableHead className="whitespace-nowrap">
                                            Tanggal
                                        </TableHead>
                                        <TableHead className="w-16 text-center">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="group cursor-pointer"
                                            onClick={() => {
                                                const isCompleted = item.report.status === "COMPLETED";
                                                const driveUrl = item.report.reportFinalDriveUrl || item.report.completedPdfPath;
                                                if (isCompleted && driveUrl) {
                                                    window.open(driveUrl, "_blank", "noopener,noreferrer");
                                                } else {
                                                    router.push(`/reports/${item.reportNumber}`);
                                                }
                                            }}
                                        >
                                            <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                                {item.reportNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">
                                                        {item.report
                                                            .storeName || "—"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        {item.report.branchName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(item.action)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                                {item.notes || (
                                                    <span className="text-muted-foreground/50 italic text-xs">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(item.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.report.status === "COMPLETED" && (item.report.reportFinalDriveUrl || item.report.completedPdfPath) ? (
                                                    <a href={item.report.reportFinalDriveUrl || item.report.completedPdfPath || ""} target="_blank" rel="noopener noreferrer">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 px-2.5 text-muted-foreground"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                            Lihat
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1.5 px-2.5 text-muted-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/reports/${item.reportNumber}`);
                                                        }}
                                                    >
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                        Lihat
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
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
                                                        : ""
                                                }
                                            />
                                        </PaginationItem>

                                        {Array.from({
                                            length: totalPages,
                                        }).map((_, i) => {
                                            const p = i + 1;
                                            if (
                                                totalPages <= 7 ||
                                                p === 1 ||
                                                p === totalPages ||
                                                (p >= currentPage - 1 &&
                                                    p <= currentPage + 1)
                                            ) {
                                                return (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={
                                                                p ===
                                                                currentPage
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(
                                                                    p,
                                                                );
                                                            }}
                                                        >
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            } else if (
                                                (p === currentPage - 2 &&
                                                    currentPage > 3) ||
                                                (p === currentPage + 2 &&
                                                    currentPage <
                                                        totalPages - 2)
                                            ) {
                                                return (
                                                    <PaginationItem
                                                        key={`ellipsis-${p}`}
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
                                                        : ""
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                                <p className="absolute right-0 text-xs text-muted-foreground hidden md:block">
                                    {total} keputusan
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <Empty>
                        <EmptyMedia>
                            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>Belum ada riwayat</EmptyTitle>
                            <EmptyDescription>
                                {searchQuery || actionFilter !== "all"
                                    ? "Tidak ditemukan riwayat yang sesuai dengan filter."
                                    : "Riwayat persetujuan estimasi dan penyelesaian akan muncul di sini."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </main>

            <Footer />
        </div>
    );
}
