"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    FileText,
    ArrowRight,
    CalendarDays,
    ChevronRight,
    User,
    Search,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import type { PjumExportListItem } from "../approval-actions";

type Props = {
    items: PjumExportListItem[];
    total: number;
    currentPage: number;
    totalPages: number;
};

export function PjumApprovalList({
    items,
    total,
    currentPage,
    totalPages,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchQuery, setSearchQuery] = useState(
        searchParams.get("search") || "",
    );
    const [dateRangeFilter, setDateRangeFilter] = useState(
        searchParams.get("dateRange") || "all",
    );

    const handleSearch = (term: string) => {
        setSearchQuery(term);
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    const handleDateRangeChange = (range: string) => {
        setDateRangeFilter(range);
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");
        if (range && range !== "all") {
            params.set("dateRange", range);
        } else {
            params.delete("dateRange");
        }
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const formatDate = (dateStr: string) =>
        format(new Date(dateStr), "d MMM yyyy", { locale: localeId });

    const formatPeriode = (from: string, to: string) =>
        `${format(new Date(from), "d MMM", { locale: localeId })} – ${format(new Date(to), "d MMM yyyy", { locale: localeId })}`;

    const createPageHref = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(page));
        return `${pathname}?${params.toString()}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Approval PJUM"
                description={`${total} PJUM menunggu persetujuan`}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6 pb-24 lg:pb-8">
                {/* Action Bar: Search, Filter */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                    <div className="flex flex-col gap-2 md:flex-row md:flex-1 md:flex-wrap">
                        <div className="relative w-full md:flex-1 md:min-w-48 md:max-w-sm">
                            <label htmlFor="report-search" className="sr-only">
                                Cari PJUM
                            </label>
                            <Search
                                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="report-search"
                                placeholder="Cari pemohon, NIK, atau unit kerja..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 md:flex-none">
                                <Select
                                    value={dateRangeFilter}
                                    onValueChange={handleDateRangeChange}
                                >
                                    <SelectTrigger
                                        className="w-full md:w-auto bg-background"
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
                                        <SelectItem value="all">
                                            Semua Waktu
                                        </SelectItem>
                                        <SelectItem value="today">
                                            Hari Ini
                                        </SelectItem>
                                        <SelectItem value="week">
                                            Minggu Ini
                                        </SelectItem>
                                        <SelectItem value="month">
                                            Bulan Ini
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "transition-opacity",
                        isPending && "opacity-50",
                    )}
                >
                    {items.length > 0 ? (
                        <>
                            {/* --- MOBILE VIEW: CARD LIST --- */}
                            <div className="relative md:hidden">
                                <div className="rounded-xl border overflow-hidden divide-y bg-card shadow-sm">
                                    {items.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/reports/pjum/${item.id}`}
                                            className="flex items-stretch hover:bg-muted/40 active:bg-muted/60 transition-colors"
                                        >
                                            {/* Left accent bar */}
                                            <span
                                                className={cn(
                                                    "w-1 shrink-0",
                                                    "bg-amber-400",
                                                )}
                                            />

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 px-3 py-3">
                                                {/* Row 1: BMS name */}
                                                <p className="font-semibold text-sm leading-tight truncate mb-1">
                                                    {item.bmsName}
                                                </p>
                                                {/* Row 2: status badge */}
                                                <span
                                                    className={cn(
                                                        "inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap mb-2",
                                                        "bg-amber-100 text-amber-700",
                                                    )}
                                                >
                                                    Menunggu Approval
                                                </span>
                                                {/* Row 3: branch + week */}
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                                                    <span className="flex items-center gap-1 min-w-0">
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {item.branchName}
                                                        </span>
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs py-0 px-1.5"
                                                    >
                                                        Minggu {item.weekNumber}
                                                    </Badge>
                                                </div>
                                                {/* Row 4: periode + report count */}
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3 shrink-0" />
                                                        {formatPeriode(
                                                            item.fromDate,
                                                            item.toDate,
                                                        )}
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {item.reportCount}{" "}
                                                        laporan
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right chevron */}
                                            <div className="flex items-center pr-3 text-muted-foreground/40">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* --- DESKTOP VIEW: DATA TABLE --- */}
                            <div className="hidden md:block border rounded-lg shadow-sm bg-card relative">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead>BMS</TableHead>
                                            <TableHead>Cabang</TableHead>
                                            <TableHead>Minggu ke</TableHead>
                                            <TableHead>Periode</TableHead>
                                            <TableHead>Jml Laporan</TableHead>
                                            <TableHead>Dibuat</TableHead>
                                            <TableHead>Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        {item.bmsName}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.branchName}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        Minggu {item.weekNumber}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatPeriode(
                                                        item.fromDate,
                                                        item.toDate,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {item.reportCount} laporan
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(item.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/reports/pjum/${item.id}`}
                                                        >
                                                            Detail
                                                            <ArrowRight className="h-4 w-4 ml-1" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {totalPages > 1 && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={createPageHref(
                                                    Math.max(
                                                        1,
                                                        currentPage - 1,
                                                    ),
                                                )}
                                                className={
                                                    currentPage <= 1
                                                        ? "pointer-events-none opacity-50"
                                                        : undefined
                                                }
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink
                                                href={createPageHref(
                                                    currentPage,
                                                )}
                                                isActive
                                            >
                                                {currentPage}
                                            </PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href={createPageHref(
                                                    Math.min(
                                                        totalPages,
                                                        currentPage + 1,
                                                    ),
                                                )}
                                                className={
                                                    currentPage >= totalPages
                                                        ? "pointer-events-none opacity-50"
                                                        : undefined
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    ) : (
                        <div className="bg-card border rounded-lg border-dashed">
                            <Empty className="py-16">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <FileText className="h-10 w-10 text-muted-foreground" />
                                    </EmptyMedia>
                                    <EmptyTitle>
                                        Tidak ada PJUM menunggu approval
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        PJUM yang dibuat BMC akan muncul di sini
                                        untuk ditinjau dan disetujui.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
