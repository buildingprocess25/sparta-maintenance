"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    Search,
    ExternalLink,
    History,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type {
    PjumBmsUser,
    PjumReportRow,
    PjumBlockedRange,
    PjumHistoryRow,
} from "../actions";
import {
    searchPjumReports,
    exportPjum,
    getPjumBlockedRanges,
} from "../actions";

type Props = {
    bmsUsers: PjumBmsUser[];
    historyItems: PjumHistoryRow[];
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

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPeriode(fromDate: string, toDate: string) {
    return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
}

function buildPjumPdfUrl(params: {
    reportNumbers: string[];
    bmsNIK: string;
    fromDate: string;
    toDate: string;
    weekNumber: number;
}) {
    const search = new URLSearchParams({
        ids: params.reportNumbers.join(","),
        bmsNIK: params.bmsNIK,
        from: params.fromDate,
        to: params.toDate,
        week: String(params.weekNumber),
    });
    return `/api/reports/pjum-pdf?${search.toString()}`;
}

function toIsoDate(d: Date): string {
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
    ].join("-");
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isDateInBlockedRanges(
    date: Date,
    ranges: PjumBlockedRange[],
): boolean {
    const day = startOfDay(date).getTime();
    return ranges.some((range) => {
        const from = startOfDay(new Date(range.fromDate)).getTime();
        const to = startOfDay(new Date(range.toDate)).getTime();
        return day >= from && day <= to;
    });
}

function findOverlappingRange(
    fromDate: Date,
    toDate: Date,
    ranges: PjumBlockedRange[],
): PjumBlockedRange | null {
    const from = startOfDay(fromDate).getTime();
    const to = startOfDay(toDate).getTime();

    return (
        ranges.find((range) => {
            const blockedFrom = startOfDay(new Date(range.fromDate)).getTime();
            const blockedTo = startOfDay(new Date(range.toDate)).getTime();
            return from <= blockedTo && to >= blockedFrom;
        }) ?? null
    );
}

function DatePickerField({
    value,
    onChange,
    label,
    minDate,
    maxDate,
    blockedRanges,
}: {
    value?: Date;
    onChange: (d: Date) => void;
    label: string;
    minDate?: Date;
    maxDate?: Date;
    blockedRanges: PjumBlockedRange[];
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
                        {value
                            ? format(value, "dd MMM yyyy", {
                                  locale: localeId,
                              })
                            : "Pilih tanggal"}
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
                        const day = startOfDay(d);
                        if (minDate && day < startOfDay(minDate)) return true;
                        if (maxDate && day > startOfDay(maxDate)) return true;
                        if (isDateInBlockedRanges(day, blockedRanges))
                            return true;
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
                    <Clock className="h-3 w-3" /> Menunggu Persetujuan Estimasi
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
                    <X className="h-3 w-3" /> Penyelesaian Ditolak (Revisi)
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

function getPjumHistoryStatusBadge(status: PjumHistoryRow["status"]) {
    switch (status) {
        case "PENDING_APPROVAL":
            return (
                <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200 shadow-none whitespace-nowrap"
                >
                    Menunggu Approval
                </Badge>
            );
        case "APPROVED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 shadow-none whitespace-nowrap"
                >
                    Disetujui
                </Badge>
            );
        case "REJECTED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 shadow-none whitespace-nowrap"
                >
                    Ditolak
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
    PENDING_ESTIMATION: "Menunggu Persetujuan Estimasi",
    ESTIMATION_APPROVED: "Estimasi Disetujui",
    ESTIMATION_REJECTED_REVISION: "Est. Ditolak (Revisi)",
    ESTIMATION_REJECTED: "Est. Ditolak",
    IN_PROGRESS: "Sedang Dikerjakan",
    PENDING_REVIEW: "Menunggu Review",
    REVIEW_REJECTED_REVISION: "Penyelesaian Ditolak (Revisi)",
    COMPLETED: "Selesai",
};

export function PjumView({ bmsUsers, historyItems }: Props) {
    const [activeTab, setActiveTab] = useState<"create" | "history">("create");
    const [selectedNIK, setSelectedNIK] = useState<string>("");
    const [weekNumber, setWeekNumber] = useState<string>("");
    const [fromDate, setFromDate] = useState<Date>();
    const [toDate, setToDate] = useState<Date>();
    const [reports, setReports] = useState<PjumReportRow[] | null>(null);
    const [historyRecords, setHistoryRecords] =
        useState<PjumHistoryRow[]>(historyItems);
    const [historyQuery, setHistoryQuery] = useState("");
    const [historyStatusFilter, setHistoryStatusFilter] = useState<
        "all" | PjumHistoryRow["status"]
    >("all");
    const [blockedRanges, setBlockedRanges] = useState<PjumBlockedRange[]>([]);
    const [isLoadingBlockedRanges, setIsLoadingBlockedRanges] = useState(false);
    const [isSearching, startSearch] = useTransition();
    const [isExporting, startExport] = useTransition();
    const [exportDone, setExportDone] = useState(false);
    const [exportedNumbers, setExportedNumbers] = useState<string[]>([]);
    const blockedRangeRequestRef = useRef(0);

    const selectedBms = bmsUsers.find((u) => u.NIK === selectedNIK);

    const from = fromDate ? toIsoDate(fromDate) : "";
    const to = toDate ? toIsoDate(toDate) : "";

    async function loadBlockedRanges(nik: string) {
        const requestId = blockedRangeRequestRef.current + 1;
        blockedRangeRequestRef.current = requestId;
        setIsLoadingBlockedRanges(true);

        try {
            const result = await getPjumBlockedRanges(nik);
            if (requestId !== blockedRangeRequestRef.current) return;

            if (result.error) {
                toast.error(result.error);
                setBlockedRanges([]);
                return;
            }

            setBlockedRanges(result.data ?? []);
        } catch {
            if (requestId !== blockedRangeRequestRef.current) return;
            toast.error(
                "Gagal memuat rentang tanggal PJUM yang sudah digunakan",
            );
            setBlockedRanges([]);
        } finally {
            if (requestId !== blockedRangeRequestRef.current) return;
            setIsLoadingBlockedRanges(false);
        }
    }

    const overlappingRange = useMemo(() => {
        if (!fromDate || !toDate) return null;
        return findOverlappingRange(fromDate, toDate, blockedRanges);
    }, [fromDate, toDate, blockedRanges]);

    const isSearchReady =
        !!selectedNIK && !!weekNumber && !!fromDate && !!toDate;
    const canSearch =
        isSearchReady &&
        !isSearching &&
        !isLoadingBlockedRanges &&
        !overlappingRange;

    function handleSearch() {
        if (!selectedNIK || !fromDate || !toDate || !weekNumber) {
            toast.error(
                "Lengkapi BMS, rentang tanggal, dan minggu ke sebelum mencari laporan",
            );
            return;
        }
        if (from > to) {
            toast.error("Tanggal mulai tidak boleh melebihi tanggal akhir");
            return;
        }
        if (overlappingRange) {
            toast.error(
                `Rentang tanggal overlap dengan PJUM sebelumnya (${formatDate(overlappingRange.fromDate)} - ${formatDate(overlappingRange.toDate)})`,
            );
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
        eligibleReports.length > 0 &&
        !hasNonCompleted &&
        !!weekNumber &&
        !overlappingRange;
    const totalAll =
        reports?.reduce((sum, r) => sum + r.totalRealisasi, 0) ?? 0;

    const filteredHistory = useMemo(() => {
        const q = historyQuery.trim().toLowerCase();

        return historyRecords.filter((item) => {
            if (
                historyStatusFilter !== "all" &&
                item.status !== historyStatusFilter
            ) {
                return false;
            }

            if (!q) return true;

            return (
                item.bmsName.toLowerCase().includes(q) ||
                item.bmsNIK.toLowerCase().includes(q) ||
                item.branchName.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q) ||
                String(item.weekNumber).includes(q)
            );
        });
    }, [historyRecords, historyQuery, historyStatusFilter]);

    function handleExport() {
        if (!canExport) return;
        if (!fromDate || !toDate) {
            toast.error("Rentang tanggal belum lengkap");
            return;
        }
        const nums = eligibleReports.map((r) => r.reportNumber);
        const week = Number(weekNumber);
        if (!Number.isInteger(week) || week < 1 || week > 5) {
            toast.error("Minggu ke wajib dipilih (1-5)");
            return;
        }
        const exportTotalRealisasi = eligibleReports.reduce(
            (sum, report) => sum + report.totalRealisasi,
            0,
        );
        const fromIso = fromDate.toISOString();
        const toIso = toDate.toISOString();
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
                const createdAt = new Date().toISOString();
                const historyBranchName =
                    eligibleReports[0]?.branchName ??
                    reports?.[0]?.branchName ??
                    "";

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
                if (result.pjumExportId) {
                    const createdExportId = result.pjumExportId;
                    setHistoryRecords((prev) => [
                        {
                            id: createdExportId,
                            status: "PENDING_APPROVAL",
                            bmsNIK: selectedNIK,
                            bmsName: selectedBms?.name ?? selectedNIK,
                            branchName: historyBranchName,
                            weekNumber: week,
                            fromDate: fromIso,
                            toDate: toIso,
                            reportNumbers: nums,
                            reportCount: nums.length,
                            totalRealisasi: exportTotalRealisasi,
                            createdAt,
                            approvedAt: null,
                            approvedByName: null,
                            rejectionNotes: null,
                        },
                        ...prev.filter((item) => item.id !== createdExportId),
                    ]);
                }
                toast.success("PJUM berhasil dibuat", {
                    description: "Menunggu approval dari BnM Manager",
                });
            }
        });
    }

    const pdfUrl = exportDone
        ? buildPjumPdfUrl({
              reportNumbers: exportedNumbers,
              bmsNIK: selectedNIK,
              fromDate: from,
              toDate: to,
              weekNumber: Number(weekNumber),
          })
        : null;

    const createHeaderDesc =
        reports !== null
            ? `${reports.length} laporan${selectedBms ? ` · ${selectedBms.name}` : ""}`
            : "Rekap pertanggungjawaban uang muka BMS";

    const historyHeaderDesc = `${historyRecords.length} dokumen PJUM`;

    const headerTitle = activeTab === "create" ? "Buat PJUM" : "Riwayat PJUM";
    const headerDesc =
        activeTab === "create" ? createHeaderDesc : historyHeaderDesc;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title={headerTitle}
                description={headerDesc}
                showBackButton
                backHref="/dashboard"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as "create" | "history")
                    }
                    className="w-full"
                >
                    <div className="mb-5">
                        <TabsList className="w-full bg-primary/10">
                            <TabsTrigger
                                value="create"
                                className="rounded-lg px-3 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-2"
                            >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">
                                    Buat PJUM
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="rounded-lg px-3 py-2.5 sm:px-4 text-muted-foreground hover:bg-primary/30 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 gap-2"
                            >
                                <History className="h-4 w-4 shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">
                                    Riwayat PJUM
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="h-5 min-w-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                >
                                    {historyRecords.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="create" className="space-y-6 mt-0">
                        {/* ── Filter bar + inline action bar ────────────────────── */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            {/* Left: filter controls */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap flex-1">
                                {/* BMS selector */}
                                <div className="w-fit max-w-full">
                                    <Select
                                        value={selectedNIK}
                                        onValueChange={(value) => {
                                            setSelectedNIK(value);
                                            setWeekNumber("");
                                            setBlockedRanges([]);
                                            setFromDate(undefined);
                                            setToDate(undefined);
                                            setReports(null);
                                            setExportDone(false);
                                            if (!value) {
                                                setIsLoadingBlockedRanges(
                                                    false,
                                                );
                                                return;
                                            }
                                            void loadBlockedRanges(value);
                                        }}
                                    >
                                        <SelectTrigger
                                            className="bg-background w-auto min-w-40 max-w-full"
                                            aria-label="Pilih BMS"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <SelectValue placeholder="Pilih BMS…" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bmsUsers.map((u) => (
                                                <SelectItem
                                                    key={u.NIK}
                                                    value={u.NIK}
                                                >
                                                    <span>{u.name}</span>
                                                    <span className="text-muted-foreground text-xs ml-1 shrink-0">
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
                                        onChange={(date) => {
                                            if (
                                                toDate &&
                                                findOverlappingRange(
                                                    date,
                                                    toDate,
                                                    blockedRanges,
                                                )
                                            ) {
                                                toast.error(
                                                    "Rentang tanggal overlap dengan PJUM yang sudah ada",
                                                );
                                                return;
                                            }
                                            setFromDate(date);
                                            setReports(null);
                                            setExportDone(false);
                                        }}
                                        label="Tanggal mulai"
                                        maxDate={toDate}
                                        blockedRanges={blockedRanges}
                                    />
                                    <span className="text-muted-foreground text-sm">
                                        —
                                    </span>
                                    <DatePickerField
                                        value={toDate}
                                        onChange={(date) => {
                                            if (
                                                fromDate &&
                                                findOverlappingRange(
                                                    fromDate,
                                                    date,
                                                    blockedRanges,
                                                )
                                            ) {
                                                toast.error(
                                                    "Rentang tanggal overlap dengan PJUM yang sudah ada",
                                                );
                                                return;
                                            }
                                            setToDate(date);
                                            setReports(null);
                                            setExportDone(false);
                                        }}
                                        label="Tanggal akhir"
                                        minDate={fromDate}
                                        blockedRanges={blockedRanges}
                                    />
                                </div>

                                {/* Week number */}
                                <div className="w-36">
                                    <Select
                                        value={weekNumber}
                                        onValueChange={(value) => {
                                            setWeekNumber(value);
                                            setReports(null);
                                            setExportDone(false);
                                        }}
                                    >
                                        <SelectTrigger aria-label="Minggu ke">
                                            <SelectValue placeholder="Minggu ke..." />
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
                                <Button
                                    onClick={handleSearch}
                                    disabled={!canSearch}
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Mencari…
                                        </>
                                    ) : isLoadingBlockedRanges ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Memuat range…
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4 mr-2" />
                                            Cari Laporan
                                        </>
                                    )}
                                </Button>
                            </div>

                            {overlappingRange && (
                                <span className="text-xs text-destructive">
                                    Rentang tanggal overlap dengan PJUM
                                    sebelumnya (
                                    {formatDate(overlappingRange.fromDate)} -{" "}
                                    {formatDate(overlappingRange.toDate)}).
                                </span>
                            )}

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
                                            Masih ada laporan belum selesai,
                                            selesaikan terlebih dahulu
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
                                        <strong>
                                            {exportedNumbers.length}
                                        </strong>{" "}
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
                                        Pilih BMS, rentang tanggal, dan minggu
                                        ke, lalu klik{" "}
                                        <strong>Cari Laporan</strong> untuk
                                        menampilkan daftar laporan.
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
                                            <EmptyTitle>
                                                Tidak ada laporan
                                            </EmptyTitle>
                                            <EmptyDescription>
                                                Tidak ada laporan ditemukan
                                                untuk BMS dan rentang tanggal
                                                yang dipilih.
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
                                                    STATUS_BAR[r.status] ??
                                                    "bg-muted";
                                                const badgeColor =
                                                    STATUS_BADGE_MOBILE[
                                                        r.status
                                                    ] ??
                                                    "bg-muted text-muted-foreground";
                                                const label =
                                                    STATUS_LABEL_MOBILE[
                                                        r.status
                                                    ] ?? r.status;

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
                                                                        Sudah
                                                                        PJUM
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Row 3: report number */}
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                                                                <span className="font-mono shrink-0">
                                                                    {
                                                                        r.reportNumber
                                                                    }
                                                                </span>
                                                            </div>
                                                            {/* Row 4: completion date + estimation */}
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarDays className="h-3 w-3 shrink-0" />
                                                                    {r.status ===
                                                                    "COMPLETED"
                                                                        ? "Selesai"
                                                                        : "Dibuat"}
                                                                    :{" "}
                                                                    {formatDate(
                                                                        r.finishedAt,
                                                                    )}
                                                                </span>
                                                                {r.totalRealisasi >
                                                                    0 && (
                                                                    <span className="font-medium text-foreground">
                                                                        {formatCurrency(
                                                                            r.totalRealisasi,
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
                                                        <TableHead>
                                                            Toko
                                                        </TableHead>
                                                        <TableHead>
                                                            Tanggal
                                                        </TableHead>
                                                        <TableHead>
                                                            Status
                                                        </TableHead>
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
                                                            r.pjumExportedAt !==
                                                            null;

                                                        return (
                                                            <TableRow
                                                                key={
                                                                    r.reportNumber
                                                                }
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
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        {
                                                                            r.reportNumber
                                                                        }
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
                                                                        r.finishedAt,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {getStatusBadge(
                                                                        r.status,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono text-sm">
                                                                    {r.totalRealisasi >
                                                                    0
                                                                        ? formatCurrency(
                                                                              r.totalRealisasi,
                                                                          )
                                                                        : "—"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {isExported ? (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 shadow-none"
                                                                        >
                                                                            Sudah
                                                                            PJUM
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
                                                    Total realisasi (
                                                    {reports.length} laporan):
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
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        {/* ── History section ───────────────────────────────────── */}
                        <section className="space-y-4 pt-2">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-base font-semibold">
                                    Riwayat PJUM
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {filteredHistory.length} dari{" "}
                                    {historyRecords.length} dokumen
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative flex-1 sm:max-w-sm">
                                    <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
                                    <Input
                                        value={historyQuery}
                                        onChange={(event) =>
                                            setHistoryQuery(event.target.value)
                                        }
                                        className="pl-9 bg-background"
                                        placeholder="Cari BMS, NIK, cabang, atau minggu PJUM"
                                        aria-label="Cari riwayat PJUM"
                                    />
                                </div>

                                <Select
                                    value={historyStatusFilter}
                                    onValueChange={(value) =>
                                        setHistoryStatusFilter(
                                            value as
                                                | "all"
                                                | PjumHistoryRow["status"],
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full sm:w-56 bg-background"
                                        aria-label="Filter status PJUM"
                                    >
                                        <SelectValue placeholder="Semua status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Semua Status
                                        </SelectItem>
                                        <SelectItem value="PENDING_APPROVAL">
                                            Menunggu Approval
                                        </SelectItem>
                                        <SelectItem value="APPROVED">
                                            Disetujui
                                        </SelectItem>
                                        <SelectItem value="REJECTED">
                                            Ditolak
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filteredHistory.length === 0 ? (
                                <div className="rounded-lg border border-dashed bg-card">
                                    <Empty className="py-10">
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon">
                                                <FileText className="h-9 w-9 text-muted-foreground" />
                                            </EmptyMedia>
                                            <EmptyTitle>
                                                Belum ada histori PJUM
                                            </EmptyTitle>
                                            <EmptyDescription>
                                                {historyQuery ||
                                                historyStatusFilter !== "all"
                                                    ? "Data tidak ditemukan untuk filter yang dipilih."
                                                    : "Dokumen PJUM yang Anda buat akan muncul di sini."}
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </div>
                            ) : (
                                <>
                                    <div className="md:hidden rounded-xl border overflow-hidden divide-y bg-card shadow-sm">
                                        {filteredHistory.map((item) => {
                                            const itemPdfUrl = buildPjumPdfUrl({
                                                reportNumbers:
                                                    item.reportNumbers,
                                                bmsNIK: item.bmsNIK,
                                                fromDate: item.fromDate,
                                                toDate: item.toDate,
                                                weekNumber: item.weekNumber,
                                            });

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="px-3 py-3 space-y-2"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm truncate">
                                                                {item.bmsName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                {item.bmsNIK}
                                                            </p>
                                                        </div>
                                                        {getPjumHistoryStatusBadge(
                                                            item.status,
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        <p>
                                                            Cabang:{" "}
                                                            {item.branchName}
                                                        </p>
                                                        <p>
                                                            Periode:{" "}
                                                            {formatPeriode(
                                                                item.fromDate,
                                                                item.toDate,
                                                            )}
                                                        </p>
                                                        <p>
                                                            Minggu{" "}
                                                            {item.weekNumber} ·{" "}
                                                            {item.reportCount}{" "}
                                                            laporan
                                                        </p>
                                                        <p>
                                                            Total realisasi:{" "}
                                                            {formatCurrency(
                                                                item.totalRealisasi,
                                                            )}
                                                        </p>
                                                        <p>
                                                            Dibuat:{" "}
                                                            {formatDateTime(
                                                                item.createdAt,
                                                            )}
                                                        </p>
                                                        {item.approvedAt && (
                                                            <p>
                                                                Diputuskan:{" "}
                                                                {formatDateTime(
                                                                    item.approvedAt,
                                                                )}
                                                                {item.approvedByName
                                                                    ? ` oleh ${item.approvedByName}`
                                                                    : ""}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <a
                                                        href={itemPdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                        >
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Buka PDF
                                                        </Button>
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                    <TableHead>
                                                        Dibuat
                                                    </TableHead>
                                                    <TableHead>BMS</TableHead>
                                                    <TableHead>
                                                        Cabang
                                                    </TableHead>
                                                    <TableHead>
                                                        Periode
                                                    </TableHead>
                                                    <TableHead>
                                                        Minggu
                                                    </TableHead>
                                                    <TableHead>
                                                        Laporan
                                                    </TableHead>
                                                    <TableHead>
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Total Realisasi
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Aksi
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredHistory.map((item) => {
                                                    const itemPdfUrl =
                                                        buildPjumPdfUrl({
                                                            reportNumbers:
                                                                item.reportNumbers,
                                                            bmsNIK: item.bmsNIK,
                                                            fromDate:
                                                                item.fromDate,
                                                            toDate: item.toDate,
                                                            weekNumber:
                                                                item.weekNumber,
                                                        });

                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                                {formatDateTime(
                                                                    item.createdAt,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium truncate">
                                                                        {
                                                                            item.bmsName
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground font-mono">
                                                                        {
                                                                            item.bmsNIK
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    item.branchName
                                                                }
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                                {formatPeriode(
                                                                    item.fromDate,
                                                                    item.toDate,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    Minggu{" "}
                                                                    {
                                                                        item.weekNumber
                                                                    }
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    item.reportCount
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {getPjumHistoryStatusBadge(
                                                                    item.status,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm">
                                                                {item.totalRealisasi >
                                                                0
                                                                    ? formatCurrency(
                                                                          item.totalRealisasi,
                                                                      )
                                                                    : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <a
                                                                    href={
                                                                        itemPdfUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                                        PDF
                                                                    </Button>
                                                                </a>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </section>
                    </TabsContent>
                </Tabs>
            </main>

            <Footer />
        </div>
    );
}
