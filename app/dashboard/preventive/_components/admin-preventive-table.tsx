"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    Activity,
    AlertCircle,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    FileText,
    Loader2,
    Search,
    Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import {
    formatJakartaDate,
    formatJakartaDateTime,
    getJakartaYear,
    getTodayJakartaDateKey,
} from "@/lib/time";
import {
    AdminPreventiveResult,
    PreventiveQuarter,
    PreventiveRow,
    getAdminPreventive,
} from "../actions";

const quarterOptions: { value: PreventiveQuarter; label: string; period: string }[] = [
    { value: 1, label: "Triwulan 1", period: "Jan-Mar" },
    { value: 2, label: "Triwulan 2", period: "Apr-Jun" },
    { value: 3, label: "Triwulan 3", period: "Jul-Sep" },
    { value: 4, label: "Triwulan 4", period: "Okt-Des" },
];

const PENDING_PAGE_SIZE = 30;
const HISTORY_PAGE_SIZE = 30;

function getCurrentQuarter(): PreventiveQuarter {
    const month = Number(getTodayJakartaDateKey().slice(5, 7));
    if (month <= 3) return 1;
    if (month <= 6) return 2;
    if (month <= 9) return 3;
    return 4;
}

function formatDate(value: string | null) {
    if (!value) return "-";
    return formatJakartaDate(value);
}

function formatDateTime(value: string | null) {
    if (!value) return "-";
    return formatJakartaDateTime(value);
}

function getQuarterInfo(row: PreventiveRow, quarter: PreventiveQuarter) {
    if (quarter === 1) return row.q1;
    if (quarter === 2) return row.q2;
    if (quarter === 3) return row.q3;
    return row.q4;
}

function matchesStoreSearch(
    row: { storeCode: string; storeName: string },
    query: string,
) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;

    return (
        row.storeCode.toLowerCase().includes(normalized) ||
        row.storeName.toLowerCase().includes(normalized)
    );
}

function formatTiming(summary: AdminPreventiveResult["summary"]) {
    if (summary.daysRemaining !== null) {
        return `${summary.daysRemaining} hari tersisa`;
    }
    if (summary.daysOverdue !== null) {
        return `Lewat ${summary.daysOverdue} hari`;
    }
    return "Belum masuk periode";
}

function MetricColumn({
    label,
    value,
    tone = "default",
}: {
    label: string;
    value: string;
    tone?: "default" | "good" | "warn" | "bad";
}) {
    return (
        <div className="min-w-0 border-b px-3 py-2 md:border-b-0 md:border-r last:md:border-r-0">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    "mt-0.5 truncate text-lg font-semibold",
                    tone === "good" && "text-emerald-700",
                    tone === "warn" && "text-amber-700",
                    tone === "bad" && "text-red-700",
                )}
            >
                {value}
            </p>
        </div>
    );
}

function ReportStatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="secondary"
            className={cn("h-5 text-[11px]", getReportStatusBadgeClass(status))}
        >
            {getReportStatusLabel(status)}
        </Badge>
    );
}

function CompletionBadge({ done }: { done: boolean }) {
    return done ? (
        <Badge className="h-5 bg-emerald-100 text-[11px] text-emerald-700 hover:bg-emerald-100">
            Selesai
        </Badge>
    ) : (
        <Badge className="h-5 bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
            Belum
        </Badge>
    );
}

function QuarterCell({
    row,
    quarter,
}: {
    row: PreventiveRow;
    quarter: PreventiveQuarter;
}) {
    const info = getQuarterInfo(row, quarter);
    if (!info) {
        return <span className="text-xs text-muted-foreground">Belum</span>;
    }

    return (
        <Link
            href={`/dashboard/reports/${info.reportNumber}`}
            className="inline-flex max-w-[220px] flex-col items-start gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-left text-[11px] text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
            <span className="font-medium">{formatDate(info.doneAt)}</span>
            <span className="truncate text-emerald-700">
                {info.bmsName || info.bmsNIK || "-"}
            </span>
        </Link>
    );
}

function EmptyTable({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return (
        <Empty className="border-0 py-12">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

export function AdminPreventiveTable({
    initialData,
    branches,
    availableYears,
    defaultBranch,
    showBranchControls = true,
    actions,
}: {
    initialData: AdminPreventiveResult;
    branches: string[];
    availableYears: number[];
    defaultBranch: string;
    showBranchControls?: boolean;
    actions?: ReactNode;
}) {
    const currentYear = getJakartaYear();
    const [data, setData] = useState<PreventiveRow[]>(initialData.rows);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialData.nextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [summary, setSummary] =
        useState<AdminPreventiveResult["summary"] | null>(initialData.summary);
    const [pendingRows, setPendingRows] = useState<PreventiveRow[]>(
        initialData.pendingRows,
    );
    const [branchSummaries, setBranchSummaries] = useState<
        AdminPreventiveResult["branchSummaries"]
    >(initialData.branchSummaries);
    const [latestReports, setLatestReports] = useState<
        AdminPreventiveResult["latestReports"]
    >(initialData.latestReports);

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [tableSearch, setTableSearch] = useState("");
    const [branchName, setBranchName] = useState<string>(defaultBranch);
    const [year, setYear] = useState<number>(initialData.summary.year || currentYear);
    const [quarter, setQuarter] =
        useState<PreventiveQuarter>(initialData.summary.quarter || getCurrentQuarter());

    const observer = useRef<IntersectionObserver | null>(null);
    const pendingObserver = useRef<IntersectionObserver | null>(null);
    const historyObserver = useRef<IntersectionObserver | null>(null);
    const didHydrateRef = useRef(false);
    const [visiblePendingCount, setVisiblePendingCount] =
        useState(PENDING_PAGE_SIZE);
    const [visibleHistoryCount, setVisibleHistoryCount] =
        useState(HISTORY_PAGE_SIZE);

    const applyResult = useCallback(
        (result: AdminPreventiveResult, append = false) => {
            setData((previous) => {
                if (!append) return result.rows;

                const existing = new Set(
                    previous.map((item) => item.storeCode),
                );
                return [
                    ...previous,
                    ...result.rows.filter(
                        (item) => !existing.has(item.storeCode),
                    ),
                ];
            });
            setNextCursor(result.nextCursor);
            setTotalCount(result.totalCount);
            setSummary(result.summary);
            setPendingRows(result.pendingRows);
            setVisiblePendingCount(PENDING_PAGE_SIZE);
            setBranchSummaries(result.branchSummaries);
            setLatestReports(result.latestReports);
            setVisibleHistoryCount(HISTORY_PAGE_SIZE);
        },
        [],
    );

    const loadMore = useCallback(async () => {
        if (!nextCursor || isFetchingMore) return;

        setIsFetchingMore(true);
        try {
            const result = await getAdminPreventive(nextCursor, 30, {
                branchName,
                year,
                quarter,
            });
            applyResult(result, true);
        } catch (error) {
            console.error("Failed to load more:", error);
        } finally {
            setIsFetchingMore(false);
        }
    }, [
        nextCursor,
        isFetchingMore,
        branchName,
        year,
        quarter,
        applyResult,
    ]);

    const lastRowRef = useCallback(
        (node: HTMLTableRowElement) => {
            if (isFetchingMore) return;
            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && nextCursor) {
                    loadMore();
                }
            });

            if (node) observer.current.observe(node);
        },
        [isFetchingMore, nextCursor, loadMore],
    );

    useEffect(() => {
        if (!didHydrateRef.current) {
            didHydrateRef.current = true;
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const result = await getAdminPreventive(null, 30, {
                    branchName,
                    year,
                    quarter,
                });
                applyResult(result);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [branchName, year, quarter, applyResult]);

    useEffect(() => {
        setVisiblePendingCount(PENDING_PAGE_SIZE);
        setVisibleHistoryCount(HISTORY_PAGE_SIZE);
    }, [tableSearch]);

    const selectedQuarter = useMemo(
        () => quarterOptions.find((item) => item.value === quarter),
        [quarter],
    );

    const filteredRows = useMemo(
        () => data.filter((row) => matchesStoreSearch(row, tableSearch)),
        [data, tableSearch],
    );
    const filteredPendingRows = useMemo(
        () => pendingRows.filter((row) => matchesStoreSearch(row, tableSearch)),
        [pendingRows, tableSearch],
    );
    const filteredHistoryRows = useMemo(
        () =>
            latestReports.filter((row) =>
                matchesStoreSearch(
                    { storeCode: row.storeCode, storeName: row.storeName },
                    tableSearch,
                ),
            ),
        [latestReports, tableSearch],
    );
    const completedRows = filteredRows.filter((row) =>
        getQuarterInfo(row, quarter),
    );
    const pendingRowsInPage = filteredRows.filter(
        (row) => !getQuarterInfo(row, quarter),
    );
    const pendingRowsToRender = filteredPendingRows.slice(
        0,
        visiblePendingCount,
    );
    const hasMorePendingRows =
        visiblePendingCount < filteredPendingRows.length;
    const historyRowsToRender = filteredHistoryRows.slice(
        0,
        visibleHistoryCount,
    );
    const hasMoreHistoryRows =
        visibleHistoryCount < filteredHistoryRows.length;
    const lowestBranch = branchSummaries[0];
    const showLowestBranchMetric = showBranchControls && branchName === "all";

    const lastPendingRowRef = useCallback(
        (node: HTMLTableRowElement) => {
            if (!hasMorePendingRows) return;
            if (pendingObserver.current) pendingObserver.current.disconnect();

            pendingObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setVisiblePendingCount((current) =>
                        Math.min(
                            current + PENDING_PAGE_SIZE,
                            filteredPendingRows.length,
                        ),
                    );
                }
            });

            if (node) pendingObserver.current.observe(node);
        },
        [hasMorePendingRows, filteredPendingRows.length],
    );

    const lastHistoryRowRef = useCallback(
        (node: HTMLTableRowElement) => {
            if (!hasMoreHistoryRows) return;
            if (historyObserver.current) historyObserver.current.disconnect();

            historyObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleHistoryCount((current) =>
                        Math.min(
                            current + HISTORY_PAGE_SIZE,
                            filteredHistoryRows.length,
                        ),
                    );
                }
            });

            if (node) historyObserver.current.observe(node);
        },
        [hasMoreHistoryRows, filteredHistoryRows.length],
    );

    return (
        <div className="flex min-h-full flex-col bg-muted/30">
            <div className="border-b bg-background px-4 py-3 lg:px-6">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                    {selectedQuarter?.label} {year}
                                </Badge>
                                <Badge variant="outline">
                                    {selectedQuarter?.period}
                                </Badge>
                                {summary ? (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            summary.daysOverdue !== null &&
                                                "border-red-200 bg-red-50 text-red-700",
                                            summary.daysRemaining !== null &&
                                                summary.daysRemaining <= 14 &&
                                                "border-amber-200 bg-amber-50 text-amber-700",
                                        )}
                                    >
                                        <CalendarClock data-icon="inline-start" />
                                        {formatTiming(summary)}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Monitoring checklist preventif per triwulan dan
                                daftar toko yang belum memenuhi target.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
                            {showBranchControls ? (
                                <Select
                                    value={branchName}
                                    onValueChange={setBranchName}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[190px]">
                                        <SelectValue placeholder="Semua Cabang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Semua Cabang
                                        </SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem
                                                key={branch}
                                                value={branch}
                                            >
                                                {branch}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : null}
                            <Select
                                value={quarter.toString()}
                                onValueChange={(value) =>
                                    setQuarter(
                                        parseInt(value, 10) as PreventiveQuarter,
                                    )
                                }
                            >
                                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[150px]">
                                    <SelectValue placeholder="Triwulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {quarterOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value.toString()}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={year.toString()}
                                onValueChange={(value) =>
                                    setYear(parseInt(value, 10))
                                }
                            >
                                <SelectTrigger className="h-9 w-full bg-background text-sm sm:w-[110px]">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map((option) => (
                                        <SelectItem
                                            key={option}
                                            value={option.toString()}
                                        >
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {actions ? <div>{actions}</div> : null}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border bg-background">
                        <div
                            className={cn(
                                "grid",
                                showLowestBranchMetric
                                    ? "md:grid-cols-5"
                                    : "md:grid-cols-4",
                            )}
                        >
                            <MetricColumn
                                label="Target toko"
                                value={(summary?.totalStores ?? totalCount).toString()}
                            />
                            <MetricColumn
                                label="Sudah checklist"
                                value={(summary?.completed ?? 0).toString()}
                                tone="good"
                            />
                            <MetricColumn
                                label="Belum checklist"
                                value={(summary?.pending ?? 0).toString()}
                                tone={(summary?.pending ?? 0) > 0 ? "bad" : "good"}
                            />
                            <MetricColumn
                                label="Coverage"
                                value={`${summary?.completionRate ?? 0}%`}
                                tone={
                                    (summary?.completionRate ?? 0) >= 90
                                        ? "good"
                                    : "warn"
                                }
                            />
                            {showLowestBranchMetric ? (
                                <MetricColumn
                                    label="Cabang terendah"
                                    value={
                                        lowestBranch
                                            ? `${lowestBranch.branchName} ${lowestBranch.completionRate}%`
                                            : "-"
                                    }
                                    tone={lowestBranch ? "warn" : "default"}
                                />
                            ) : null}
                        </div>
                        <div className="border-t bg-muted/20 px-3 py-2">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                    style={{
                                        width: `${summary?.completionRate ?? 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="quarter" className="gap-0">
                <div className="sticky top-15 z-30 border-b bg-background/95 px-4 pt-2 backdrop-blur supports-backdrop-filter:bg-background/80 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12 lg:px-6">
                    <div className="flex flex-col gap-2 pb-1 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-none overflow-x-auto overflow-y-hidden pb-1">
                            <TabsList
                                variant="line"
                                className="h-8 w-max justify-start rounded-none p-0"
                            >
                                <TabsTrigger value="quarter" className="h-8 flex-none px-3 text-xs">
                                    <ClipboardCheck data-icon="inline-start" />
                                    Sudah Checklist
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        {summary?.completed ?? 0}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="pending" className="h-8 flex-none px-3 text-xs">
                                    <AlertCircle data-icon="inline-start" />
                                    Belum Checklist
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                        {summary?.pending ?? 0}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="matrix" className="h-8 flex-none px-3 text-xs">
                                    <BarChart3 data-icon="inline-start" />
                                    Matriks Tahunan
                                </TabsTrigger>
                                {showBranchControls ? (
                                    <TabsTrigger value="branches" className="h-8 flex-none px-3 text-xs">
                                        <Store data-icon="inline-start" />
                                        Cabang
                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                            {branchSummaries.length}
                                        </Badge>
                                    </TabsTrigger>
                                ) : null}
                                <TabsTrigger value="history" className="h-8 flex-none px-3 text-xs">
                                    <Activity data-icon="inline-start" />
                                    Riwayat
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="relative w-full lg:w-[280px]">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari kode / nama toko"
                                className="h-8 bg-background pl-8 text-xs"
                                value={tableSearch}
                                onChange={(event) =>
                                    setTableSearch(event.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 lg:p-6">
                    <TabsContent value="quarter" className="mt-0">
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[54px] text-[11px]">No</TableHead>
                                        <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                                        <TableHead className="min-w-[130px] text-[11px]">Cabang</TableHead>
                                        <TableHead className="min-w-[110px] text-[11px]">Status</TableHead>
                                        <TableHead className="min-w-[130px] text-[11px]">Tanggal</TableHead>
                                        <TableHead className="min-w-[170px] text-[11px]">BMS</TableHead>
                                        <TableHead className="min-w-[120px] text-[11px]">Item diperbaiki</TableHead>
                                        <TableHead className="min-w-[140px] text-[11px]">Laporan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-28 text-center">
                                                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <EmptyTable
                                                    icon={ClipboardCheck}
                                                    title="Tidak ada toko"
                                                    description="Filter tidak menemukan toko untuk periode ini."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRows.map((row, index) => {
                                            const info = getQuarterInfo(row, quarter);
                                            const isLast =
                                                index === filteredRows.length - 1;

                                            return (
                                                <TableRow
                                                    key={row.storeCode}
                                                    ref={isLast ? lastRowRef : null}
                                                    className={!info ? "bg-red-50/30" : undefined}
                                                >
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium">{row.storeName}</div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {row.storeCode}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{row.branchName}</TableCell>
                                                    <TableCell>
                                                        <CompletionBadge done={Boolean(info)} />
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {formatDate(info?.doneAt ?? null)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {info ? (
                                                            <>
                                                                <div className="font-medium">
                                                                    {info.bmsName || "-"}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    {info.bmsNIK || "-"}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {info ? info.issueCount : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {info ? (
                                                            <div className="flex flex-col items-start gap-1">
                                                                <Link
                                                                    href={`/dashboard/reports/${info.reportNumber}`}
                                                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                                                >
                                                                    {info.reportNumber}
                                                                </Link>
                                                                <ReportStatusBadge status={info.status} />
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                    {isFetchingMore ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-14 text-center">
                                                <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Menampilkan {filteredRows.length} dari {totalCount} toko. Dalam halaman ini: {completedRows.length} selesai, {pendingRowsInPage.length} belum.
                        </p>
                    </TabsContent>

                    <TabsContent value="pending" className="mt-0">
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[54px] text-[11px]">No</TableHead>
                                        <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                                        <TableHead className="min-w-[140px] text-[11px]">Cabang</TableHead>
                                        <TableHead className="min-w-[150px] text-[11px]">Status Target</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-28 text-center">
                                                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPendingRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4}>
                                                <EmptyTable
                                                    icon={CheckCircle2}
                                                    title="Semua toko sudah checklist"
                                                    description="Tidak ada toko tertinggal untuk triwulan yang dipilih."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingRowsToRender.map((row, index) => {
                                            const isLast =
                                                index ===
                                                pendingRowsToRender.length - 1;

                                            return (
                                            <TableRow
                                                key={row.storeCode}
                                                ref={
                                                    isLast
                                                        ? lastPendingRowRef
                                                        : null
                                                }
                                            >
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{row.storeName}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {row.storeCode}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">{row.branchName}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                        Belum checklist {selectedQuarter?.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })
                                    )}
                                    {hasMorePendingRows ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="h-12 text-center text-xs text-muted-foreground"
                                            >
                                                Memuat data berikutnya...
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                        {filteredPendingRows.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Menampilkan {pendingRowsToRender.length} dari{" "}
                                {filteredPendingRows.length} toko belum checklist.
                            </p>
                        ) : null}
                    </TabsContent>

                    <TabsContent value="matrix" className="mt-0">
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[54px] text-[11px]">No</TableHead>
                                        <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                                        <TableHead className="min-w-[130px] text-[11px]">Cabang</TableHead>
                                        {quarterOptions.map((option) => (
                                            <TableHead
                                                key={option.value}
                                                className="min-w-[170px] text-[11px]"
                                            >
                                                {option.label}
                                                <span className="ml-1 text-muted-foreground">
                                                    {option.period}
                                                </span>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <EmptyTable
                                                    icon={BarChart3}
                                                    title="Matriks kosong"
                                                    description="Tidak ada toko untuk filter yang dipilih."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRows.map((row, index) => {
                                            const isLast =
                                                index === filteredRows.length - 1;
                                            return (
                                                <TableRow
                                                    key={row.storeCode}
                                                    ref={isLast ? lastRowRef : null}
                                                >
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium">{row.storeName}</div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {row.storeCode}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{row.branchName}</TableCell>
                                                    {quarterOptions.map((option) => (
                                                        <TableCell key={option.value}>
                                                            <QuarterCell
                                                                row={row}
                                                                quarter={option.value}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                    {isFetchingMore ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-14 text-center">
                                                <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {showBranchControls ? (
                        <TabsContent value="branches" className="mt-0">
                            <div className="overflow-hidden rounded-lg border bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="min-w-[180px] text-[11px]">Cabang</TableHead>
                                            <TableHead className="min-w-[100px] text-[11px]">Target</TableHead>
                                            <TableHead className="min-w-[100px] text-[11px]">Selesai</TableHead>
                                            <TableHead className="min-w-[100px] text-[11px]">Belum</TableHead>
                                            <TableHead className="min-w-[220px] text-[11px]">Coverage</TableHead>
                                            <TableHead className="min-w-[140px] text-[11px]">Terakhir</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {branchSummaries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6}>
                                                    <EmptyTable
                                                        icon={Store}
                                                        title="Tidak ada cabang"
                                                        description="Filter belum menghasilkan ringkasan cabang."
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            branchSummaries.map((branch) => (
                                                <TableRow key={branch.branchName}>
                                                    <TableCell className="text-xs font-medium">
                                                        {branch.branchName}
                                                    </TableCell>
                                                    <TableCell className="text-xs">{branch.totalStores}</TableCell>
                                                    <TableCell className="text-xs text-emerald-700">
                                                        {branch.completed}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-red-700">
                                                        {branch.pending}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2 w-36 overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{
                                                                        width: `${branch.completionRate}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium">
                                                                {branch.completionRate}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {formatDate(branch.lastDoneAt)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    ) : null}

                    <TabsContent value="history" className="mt-0">
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                Semua laporan preventif untuk{" "}
                                <span className="font-medium text-foreground">
                                    {selectedQuarter?.label} {year}
                                </span>
                                .
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="min-w-[150px] text-[11px]">Waktu</TableHead>
                                        <TableHead className="min-w-[260px] text-[11px]">Toko</TableHead>
                                        <TableHead className="min-w-[160px] text-[11px]">BMS</TableHead>
                                        <TableHead className="min-w-[120px] text-[11px]">Item diperbaiki</TableHead>
                                        <TableHead className="min-w-[150px] text-[11px]">Laporan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistoryRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <EmptyTable
                                                    icon={Clock}
                                                    title="Belum ada riwayat"
                                                    description="Belum ada laporan preventive pada tahun dan filter ini."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        historyRowsToRender.map((report, index) => {
                                            const isLast =
                                                index ===
                                                historyRowsToRender.length - 1;

                                            return (
                                            <TableRow
                                                key={report.reportNumber}
                                                ref={
                                                    isLast
                                                        ? lastHistoryRowRef
                                                        : null
                                                }
                                            >
                                                <TableCell className="text-xs">
                                                    {formatDateTime(report.doneAt)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{report.storeName}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {report.storeCode} • {report.branchName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{report.bmsName || "-"}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {report.bmsNIK || "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {report.issueCount}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <Button asChild variant="outline" size="xs">
                                                            <Link href={`/dashboard/reports/${report.reportNumber}`}>
                                                                <FileText data-icon="inline-start" />
                                                                {report.reportNumber}
                                                            </Link>
                                                        </Button>
                                                        <ReportStatusBadge status={report.status} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })
                                    )}
                                    {hasMoreHistoryRows ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-12 text-center text-xs text-muted-foreground"
                                            >
                                                Memuat riwayat berikutnya...
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                        {filteredHistoryRows.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Menampilkan {historyRowsToRender.length} dari{" "}
                                {filteredHistoryRows.length} riwayat preventive.
                            </p>
                        ) : null}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
