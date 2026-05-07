"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Loader2, Search } from "lucide-react";
import { getAdminReports, AdminReportFilters } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { StatusBadge } from "@/app/reports/[reportNumber]/_components/status-badge";

type ReportItem = Awaited<ReturnType<typeof getAdminReports>>["reports"][0];

const STATUS_OPTIONS = [
    { value: "all", label: "Semua Status" },
    { value: "PENDING_ESTIMATION", label: "Menunggu Persetujuan Estimasi" },
    { value: "ESTIMATION_APPROVED", label: "Estimasi Disetujui" },
    {
        value: "ESTIMATION_REJECTED_REVISION",
        label: "Estimasi Ditolak (Revisi)",
    },
    { value: "ESTIMATION_REJECTED", label: "Estimasi Ditolak" },
    { value: "IN_PROGRESS", label: "Sedang Dikerjakan" },
    { value: "PENDING_REVIEW", label: "Menunggu Review Penyelesaian" },
    { value: "APPROVED_BMC", label: "Menunggu Persetujuan Final BNM" },
    {
        value: "REVIEW_REJECTED_REVISION",
        label: "Penyelesaian Ditolak (Revisi)",
    },
    { value: "COMPLETED", label: "Selesai" },
];

function formatRp(n: number | null | undefined) {
    if (n === null || n === undefined) return "-";
    return `Rp ${n.toLocaleString("id-ID")}`;
}

// Removed local StatusBadge, using global one from reports feature

export function AdminReportsTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    initialStatus = "all",
}: {
    initialData: ReportItem[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    initialStatus?: string;
}) {
    const [reports, setReports] = useState<ReportItem[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [bmsQuery, setBmsQuery] = useState("");
    const [branchName, setBranchName] = useState("all");
    const [status, setStatus] = useState(initialStatus);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminReportFilters = {
                search: search || undefined,
                bmsQuery: bmsQuery || undefined,
                branchName: branchName === "all" ? undefined : branchName,
                status: status === "all" ? undefined : status,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminReports(cursor, 20, filters);

                if (isInitial) {
                    setReports(res.reports);
                    setTotalCount(res.totalCount);
                } else {
                    setReports((prev) => [...prev, ...res.reports]);
                }
                setNextCursor(res.nextCursor);
            } catch (error) {
                toast.error("Gagal memuat data laporan");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search, bmsQuery, branchName, status, fromDate, toDate],
    );

    // Initial load when filters change (debounced for text inputs)
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            loadData(null, true);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [search, bmsQuery, branchName, status, fromDate, toDate, loadData]);

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
            <div className="flex items-center justify-between">
                <div className="text-sm">
                    Total <span className="text-foreground">{totalCount}</span>{" "}
                    laporan
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-[2] min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari Laporan / Toko..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex-[1.5] min-w-[150px]">
                    <Input
                        placeholder="NIK / Nama BMS..."
                        className="bg-white h-8 text-xs w-full"
                        value={bmsQuery}
                        onChange={(e) => setBmsQuery(e.target.value)}
                    />
                </div>
                <Select value={branchName} onValueChange={setBranchName}>
                    <SelectTrigger className="flex-[0.7] min-w-[120px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            Semua Cabang
                        </SelectItem>
                        {branches.map((b) => (
                            <SelectItem key={b} value={b} className="text-xs">
                                {b}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="flex-[1.2] min-w-[160px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                            <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="text-xs"
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5 flex-[1.8] min-w-[260px]">
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="flex-1 bg-white h-8 text-xs"
                        title="Dari Tanggal"
                    />
                    <span className="text-muted-foreground text-[10px] uppercase font-bold shrink-0">
                        s/d
                    </span>
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="flex-1 bg-white h-8 text-xs"
                        title="Sampai Tanggal"
                    />
                </div>
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
                                <TableHead className="w-[140px]">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && !isFetchingNextPage ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-32 text-center"
                                    >
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada laporan yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reports.map((report) => (
                                    <TableRow key={report.reportNumber}>
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
