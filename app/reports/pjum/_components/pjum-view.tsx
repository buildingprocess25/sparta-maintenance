"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    Search,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Loader2,
    CalendarDays,
    Check,
    X,
    Clock,
    Wrench,
    FileText,
    User,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import type { PjumBmsUser, PjumReportRow } from "../actions";
import { searchPjumReports, exportPjum } from "../actions";

type Props = {
    bmsUsers: PjumBmsUser[];
};

const STATUS_BAR: Record<string, string> = {
    PENDING_ESTIMATION: "bg-yellow-400",
    ESTIMATION_APPROVED: "bg-green-500",
    ESTIMATION_REJECTED_REVISION: "bg-orange-500",
    ESTIMATION_REJECTED: "bg-red-500",
    IN_PROGRESS: "bg-blue-500",
    PENDING_REVIEW: "bg-purple-500",
    REVIEW_REJECTED_REVISION: "bg-orange-500",
    COMPLETED: "bg-emerald-500",
};

function formatCurrency(amount: number) {
    return `Rp ${Number(amount).toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Default date range: 7 days ago → today
function defaultFrom(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
}
function defaultTo(): Date {
    return new Date();
}

function toIsoDate(d: Date): string {
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
}

function DatePickerField({
    value,
    onChange,
    label,
    minDate,
    maxDate,
}: {
    value: Date;
    onChange: (d: Date) => void;
    label: string;
    minDate?: Date;
    maxDate?: Date;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-36 justify-start text-left font-normal bg-background"
                    aria-label={label}
                >
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                        {format(value, "dd MMM yyyy", { locale: localeId })}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(d) => {
                        if (d) {
                            onChange(d);
                            setOpen(false);
                        }
                    }}
                    disabled={(d) => {
                        if (minDate && d < minDate) return true;
                        if (maxDate && d > maxDate) return true;
                        return false;
                    }}
                    locale={localeId}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-200 shadow-none whitespace-nowrap"
                >
                    <Clock className="h-3 w-3" /> Menunggu Estimasi
                </Badge>
            );
        case "ESTIMATION_APPROVED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 shadow-none whitespace-nowrap"
                >
                    <Check className="h-3 w-3" /> Estimasi Disetujui
                </Badge>
            );
        case "ESTIMATION_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 shadow-none whitespace-nowrap"
                >
                    <X className="h-3 w-3" /> Estimasi Ditolak (Revisi)
                </Badge>
            );
        case "ESTIMATION_REJECTED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 shadow-none whitespace-nowrap"
                >
                    <X className="h-3 w-3" /> Estimasi Ditolak
                </Badge>
            );
        case "IN_PROGRESS":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 shadow-none whitespace-nowrap"
                >
                    <Wrench className="h-3 w-3" /> Sedang Dikerjakan
                </Badge>
            );
        case "PENDING_REVIEW":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-100/80 border-purple-200 shadow-none whitespace-nowrap"
                >
                    <Clock className="h-3 w-3" /> Menunggu Review
                </Badge>
            );
        case "REVIEW_REJECTED_REVISION":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 shadow-none whitespace-nowrap"
                >
                    <X className="h-3 w-3" /> Ditolak (Revisi)
                </Badge>
            );
        case "COMPLETED":
            return (
                <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200 shadow-none whitespace-nowrap"
                >
                    <CheckCircle2 className="h-3 w-3" /> Selesai
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

// Mobile badge (text only, no icon, compact)
const STATUS_BADGE_MOBILE: Record<string, string> = {
    PENDING_ESTIMATION: "bg-yellow-100 text-yellow-700",
    ESTIMATION_APPROVED: "bg-green-100 text-green-700",
    ESTIMATION_REJECTED_REVISION: "bg-orange-100 text-orange-700",
    ESTIMATION_REJECTED: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PENDING_REVIEW: "bg-purple-100 text-purple-700",
    REVIEW_REJECTED_REVISION: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL_MOBILE: Record<string, string> = {
    PENDING_ESTIMATION: "Menunggu Estimasi",
    ESTIMATION_APPROVED: "Estimasi Disetujui",
    ESTIMATION_REJECTED_REVISION: "Est. Ditolak (Revisi)",
    ESTIMATION_REJECTED: "Est. Ditolak",
    IN_PROGRESS: "Sedang Dikerjakan",
    PENDING_REVIEW: "Menunggu Review",
    REVIEW_REJECTED_REVISION: "Ditolak (Revisi)",
    COMPLETED: "Selesai",
};

export function PjumView({ bmsUsers }: Props) {
    const [selectedNIK, setSelectedNIK] = useState<string>("");
    const [weekNumber, setWeekNumber] = useState<string>("");
    const [fromDate, setFromDate] = useState<Date>(defaultFrom);
    const [toDate, setToDate] = useState<Date>(defaultTo);
    const [reports, setReports] = useState<PjumReportRow[] | null>(null);
    const [isSearching, startSearch] = useTransition();
    const [isExporting, startExport] = useTransition();
    const [exportDone, setExportDone] = useState(false);
    const [exportedNumbers, setExportedNumbers] = useState<string[]>([]);

    const selectedBms = bmsUsers.find((u) => u.NIK === selectedNIK);

    const from = toIsoDate(fromDate);
    const to = toIsoDate(toDate);

    function handleSearch() {
        if (!selectedNIK) {
            toast.error("Pilih BMS terlebih dahulu");
            return;
        }
        if (from > to) {
            toast.error("Tanggal mulai tidak boleh melebihi tanggal akhir");
            return;
        }
        setReports(null);
        setExportDone(false);
        startSearch(async () => {
            const result = await searchPjumReports(selectedNIK, from, to);
            if (result.error) {
                toast.error(result.error);
            } else {
                setReports(result.data ?? []);
            }
        });
    }

    const eligibleReports =
        reports?.filter((r) => r.status === "COMPLETED" && !r.pjumExportedAt) ??
        [];
    const hasNonCompleted =
        reports?.some((r) => r.status !== "COMPLETED") ?? false;
    const canExport =
        eligibleReports.length > 0 && !hasNonCompleted && !!weekNumber;
    const totalAll =
        reports?.reduce((sum, r) => sum + r.totalEstimation, 0) ?? 0;

    function handleExport() {
        if (!canExport) return;
        const nums = eligibleReports.map((r) => r.reportNumber);
        const week = Number(weekNumber);
        if (!Number.isInteger(week) || week < 1 || week > 5) {
            toast.error("Minggu ke wajib dipilih (1-5)");
            return;
        }
        startExport(async () => {
            const result = await exportPjum({
                reportNumbers: nums,
                bmsNIK: selectedNIK,
                from,
                to,
                weekNumber: week,
            });
            if (result.error) {
                toast.error("Gagal membuat PJUM", {
                    description: result.error,
                });
            } else {
                setExportedNumbers(nums);
                setExportDone(true);
                setReports(
                    (prev) =>
                        prev?.map((r) =>
                            nums.includes(r.reportNumber)
                                ? {
                                      ...r,
                                      pjumExportedAt: new Date().toISOString(),
                                  }
                                : r,
                        ) ?? null,
                );
                toast.success("PJUM berhasil dibuat");
            }
        });
    }

    const pdfUrl = exportDone
        ? `/api/reports/pjum-pdf?ids=${exportedNumbers.join(",")}&bmsNIK=${selectedNIK}&from=${from}&to=${to}&week=${weekNumber}`
        : null;

    const headerDesc =
        reports !== null
            ? `${reports.length} laporan${selectedBms ? ` · ${selectedBms.name}` : ""}`
            : "Rekap pertanggungjawaban uang muka BMS";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Buat PJUM"
                description={headerDesc}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* ── Filter bar + inline action bar ────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    {/* Left: filter controls */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap flex-1">
                        {/* BMS selector */}
                        <div className="flex-1 min-w-40 max-w-xs">
                            <Select
                                value={selectedNIK}
                                onValueChange={setSelectedNIK}
                            >
                                <SelectTrigger
                                    className="bg-background w-full"
                                    aria-label="Pilih BMS"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <User className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Pilih BMS…" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {bmsUsers.map((u) => (
                                        <SelectItem key={u.NIK} value={u.NIK}>
                                            {u.name}{" "}
                                            <span className="text-muted-foreground text-xs ml-1">
                                                {u.NIK}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <DatePickerField
                                value={fromDate}
                                onChange={setFromDate}
                                label="Tanggal mulai"
                                maxDate={toDate}
                            />
                            <span className="text-muted-foreground text-sm">
                                —
                            </span>
                            <DatePickerField
                                value={toDate}
                                onChange={setToDate}
                                label="Tanggal akhir"
                                minDate={fromDate}
                            />
                        </div>

                        {/* Week number */}
                        <div className="w-36">
                            <Select
                                value={weekNumber}
                                onValueChange={setWeekNumber}
                            >
                                <SelectTrigger aria-label="Minggu ke">
                                    <SelectValue placeholder="Minggu ke" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((week) => (
                                        <SelectItem
                                            key={week}
                                            value={String(week)}
                                        >
                                            Minggu ke {week}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search button */}
                        <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Mencari…
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Cari Laporan
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Right: action panel — slides in when results exist */}
                    <div
                        className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 transition-all duration-200 ${
                            reports !== null && reports.length > 0
                                ? "opacity-100 translate-y-0 bg-muted/40"
                                : "opacity-0 pointer-events-none -translate-y-1"
                        }`}
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm">
                                <span className="font-semibold text-foreground">
                                    {reports?.length ?? 0}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                    laporan
                                </span>
                                {" · "}
                                <span className="font-medium text-foreground">
                                    {formatCurrency(totalAll)}
                                </span>
                            </span>
                            {hasNonCompleted && (
                                <span className="flex items-center gap-1 text-amber-600 text-xs">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    Masih ada laporan belum selesai, selesaikan
                                    terlebih dahulu
                                </span>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="ml-auto"
                            onClick={handleExport}
                            disabled={!canExport || isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Membuat…
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Buat PJUM ({eligibleReports.length})
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* ── Export success banner ──────────────────────────────── */}
                {exportDone && pdfUrl && (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-green-800 text-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>
                                PJUM berhasil dibuat untuk{" "}
                                <strong>{exportedNumbers.length}</strong>{" "}
                                laporan
                            </span>
                        </div>
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button size="sm" variant="outline">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Buka PDF
                            </Button>
                        </a>
                    </div>
                )}

                {/* ── Initial empty state ───────────────────────────────── */}
                {reports === null && !isSearching && (
                    <Empty>
                        <EmptyMedia>
                            <Search className="h-10 w-10 text-muted-foreground/50" />
                        </EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>Belum ada pencarian</EmptyTitle>
                            <EmptyDescription>
                                Pilih BMS dan rentang tanggal, lalu klik{" "}
                                <strong>Cari Laporan</strong> untuk menampilkan
                                daftar laporan.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}

                {/* ── Results table ─────────────────────────────────────── */}
                {reports !== null && (
                    <>
                        {reports.length === 0 ? (
                            <Empty>
                                <EmptyMedia>
                                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                                </EmptyMedia>
                                <EmptyHeader>
                                    <EmptyTitle>Tidak ada laporan</EmptyTitle>
                                    <EmptyDescription>
                                        Tidak ada laporan ditemukan untuk BMS
                                        dan rentang tanggal yang dipilih.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <>
                                {/* ── Mobile list ───────────────────────── */}
                                <div className="md:hidden rounded-xl border overflow-hidden divide-y bg-card shadow-sm">
                                    {reports.map((r) => {
                                        const isExported =
                                            r.pjumExportedAt !== null;
                                        const barColor =
                                            STATUS_BAR[r.status] ?? "bg-muted";
                                        const badgeColor =
                                            STATUS_BADGE_MOBILE[r.status] ??
                                            "bg-muted text-muted-foreground";
                                        const label =
                                            STATUS_LABEL_MOBILE[r.status] ??
                                            r.status;

                                        return (
                                            <div
                                                key={r.reportNumber}
                                                className={`flex items-stretch transition-colors hover:bg-muted/40 ${isExported ? "opacity-60" : ""}`}
                                            >
                                                {/* Color status bar */}
                                                <span
                                                    className={`w-1 shrink-0 ${barColor}`}
                                                />

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 px-3 py-3">
                                                    {/* Row 1: store code + name */}
                                                    <p className="font-semibold text-sm leading-tight truncate mb-1">
                                                        {r.storeCode
                                                            ? `${r.storeCode} – ${r.storeName || "—"}`
                                                            : r.storeName ||
                                                              "—"}
                                                    </p>
                                                    {/* Row 2: status badge + PJUM badge */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span
                                                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badgeColor}`}
                                                        >
                                                            {label}
                                                        </span>
                                                        {isExported && (
                                                            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                                Sudah PJUM
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Row 3: report number */}
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                                                        <span className="font-mono shrink-0">
                                                            {r.reportNumber}
                                                        </span>
                                                    </div>
                                                    {/* Row 4: date + estimation */}
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarDays className="h-3 w-3 shrink-0" />
                                                            {formatDate(
                                                                r.createdAt,
                                                            )}
                                                        </span>
                                                        {r.totalEstimation >
                                                            0 && (
                                                            <span className="font-medium text-foreground">
                                                                {formatCurrency(
                                                                    r.totalEstimation,
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Link to report */}
                                                <div className="flex items-center pr-3">
                                                    <Link
                                                        href={`/reports/${r.reportNumber}`}
                                                        target="_blank"
                                                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Desktop table ─────────────────────── */}
                                <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="w-28">
                                                    Nomor Laporan
                                                </TableHead>
                                                <TableHead>Toko</TableHead>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
                                                    Total Realisasi
                                                </TableHead>
                                                <TableHead className="text-center w-24">
                                                    PJUM
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reports.map((r) => {
                                                const isExported =
                                                    r.pjumExportedAt !== null;

                                                return (
                                                    <TableRow
                                                        key={r.reportNumber}
                                                        className={
                                                            isExported
                                                                ? "opacity-60"
                                                                : ""
                                                        }
                                                    >
                                                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                                            <Link
                                                                href={`/reports/${r.reportNumber}`}
                                                                className="hover:text-primary hover:underline transition-colors"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                {r.reportNumber}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-medium text-sm">
                                                                {r.storeCode
                                                                    ? `${r.storeCode} – ${r.storeName || "—"}`
                                                                    : r.storeName ||
                                                                      "—"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDate(
                                                                r.createdAt,
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(
                                                                r.status,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            {r.totalEstimation >
                                                            0
                                                                ? formatCurrency(
                                                                      r.totalEstimation,
                                                                  )
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {isExported ? (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 shadow-none"
                                                                >
                                                                    Sudah PJUM
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>

                                    {/* Total footer */}
                                    <div className="flex items-center justify-end gap-4 px-4 py-3 border-t bg-muted/30 rounded-b-lg text-sm">
                                        <span className="text-muted-foreground">
                                            Total realisasi ({reports.length}{" "}
                                            laporan):
                                        </span>
                                        <span className="font-bold tabular-nums">
                                            {formatCurrency(totalAll)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}
