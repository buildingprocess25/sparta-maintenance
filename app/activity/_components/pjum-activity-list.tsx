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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import { Filter, Activity, Loader2, CalendarDays, X } from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PjumActivityItem } from "@/app/dashboard/queries";

const ACTIVITY_CONFIG: Record<string, { label: string; color: string }> = {
    PJUM_CREATED: {
        label: "PJUM Diajukan",
        color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    PJUM_APPROVED: {
        label: "PJUM Disetujui",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
};

type Props = {
    activities: PjumActivityItem[];
    total: number;
    totalPages: number;
    currentPage: number;
};

export function PjumActivityList({
    activities,
    total,
    totalPages,
    currentPage,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [calendarOpen, setCalendarOpen] = useState(false);

    const actionFilter = searchParams.get("action") || "all";
    const dateParam = searchParams.get("date") || "";
    const selectedDate = dateParam ? new Date(dateParam) : undefined;

    const pushParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        }
        params.set("page", "1");
        startTransition(() =>
            router.replace(`${pathname}?${params.toString()}`),
        );
    };

    const handleActionChange = (action: string) => {
        pushParams({ action: action === "all" ? null : action });
    };

    const handleDateSelect = (d: Date | undefined) => {
        if (d) {
            const dateStr = format(d, "yyyy-MM-dd");
            pushParams({ date: dateStr });
            setCalendarOpen(false);
        }
    };

    const clearDateFilter = () => {
        pushParams({ date: null });
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

    const getActivityBadge = (action: string) => {
        const cfg = ACTIVITY_CONFIG[action] ?? {
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
                title="Semua Aktivitas PJUM"
                description={`${total} aktivitas`}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar: Filter */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Date Picker */}
                    <div className="flex items-center gap-1.5">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-auto justify-start text-left font-normal bg-background"
                                    aria-label="Filter tanggal"
                                >
                                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                    <span className="text-sm">
                                        {selectedDate
                                            ? format(selectedDate, "dd MMM yyyy", { locale: localeId })
                                            : "Pilih tanggal"}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    locale={localeId}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {selectedDate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={clearDateFilter}
                                aria-label="Hapus filter tanggal"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Action Filter */}
                    <Select
                        value={actionFilter}
                        onValueChange={handleActionChange}
                    >
                        <SelectTrigger
                            className="w-auto bg-background"
                            aria-label="Filter berdasarkan jenis aktivitas"
                        >
                            <div className="flex items-center gap-2">
                                <Filter
                                    className="h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <SelectValue placeholder="Aktivitas" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Aktivitas</SelectItem>
                            <SelectItem value="PJUM_CREATED">
                                PJUM Diajukan
                            </SelectItem>
                            <SelectItem value="PJUM_APPROVED">
                                PJUM Disetujui
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
                                        className="bg-card border rounded-lg shadow-sm p-4 space-y-3"
                                    >
                                        <div className="text-xs text-muted-foreground">
                                            {formatDate(item.createdAt)}
                                        </div>
                                        <div>
                                            {getActivityBadge(item.action)}
                                        </div>
                                        <div className="text-xs text-muted-foreground pt-1">
                                            {item.actor.name}
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
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead className="min-w-52">
                                            Aktivitas
                                        </TableHead>
                                        <TableHead>Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(item.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                {getActivityBadge(item.action)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {item.actor.name}
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
                                    {total} aktivitas
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <Empty>
                        <EmptyMedia>
                            <Activity className="h-8 w-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>Tidak ada aktivitas</EmptyTitle>
                            <EmptyDescription>
                                {actionFilter !== "all"
                                    ? "Tidak ditemukan aktivitas PJUM yang sesuai dengan filter."
                                    : "Belum ada aktivitas PJUM yang tercatat."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </main>

            <Footer />
        </div>
    );
}
