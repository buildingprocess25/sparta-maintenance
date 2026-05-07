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
import { getAdminPjum, AdminPjumFilters, PjumRow } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

function formatDate(date: Date) {
    return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function getStatusColor(status: string) {
    switch (status) {
        case "APPROVED":
            return "bg-green-100 text-green-700 hover:bg-green-100";
        case "REJECTED":
            return "bg-red-100 text-red-700 hover:bg-red-100";
        case "PENDING_APPROVAL":
            return "bg-amber-100 text-amber-700 hover:bg-amber-100";
        default:
            return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "APPROVED":
            return "Disetujui";
        case "REJECTED":
            return "Ditolak";
        case "PENDING_APPROVAL":
            return "Menunggu Approval";
        default:
            return status;
    }
}

export function AdminPjumTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
}: {
    initialData: PjumRow[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
}) {
    const [pjums, setPjums] = useState<PjumRow[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [branchName, setBranchName] = useState("all");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminPjumFilters = {
                search: search || undefined,
                branchName: branchName === "all" ? undefined : branchName,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminPjum(cursor, 20, filters);

                if (isInitial) {
                    setPjums(res.pjums);
                    setTotalCount(res.totalCount);
                } else {
                    setPjums((prev) => [...prev, ...res.pjums]);
                }
                setNextCursor(res.nextCursor);
            } catch (error) {
                toast.error("Gagal memuat data PJUM");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search, branchName],
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
    }, [search, branchName, loadData]);

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
                    Total{" "}
                    <span className="text-foreground font-medium">
                        {totalCount}
                    </span>{" "}
                    PJUM
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-[2] min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari NIK / Nama BMS..."
                        className="pl-8 bg-white h-8 text-xs w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={branchName} onValueChange={setBranchName}>
                    <SelectTrigger className="flex-[1] min-w-[150px] bg-white h-8 text-xs">
                        <SelectValue placeholder="Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Cabang</SelectItem>
                        {branches.map((b) => (
                            <SelectItem key={b} value={b}>
                                {b}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[100px]">
                                    Minggu Ke-
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    BMS
                                </TableHead>
                                <TableHead className="min-w-[180px]">
                                    Periode
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    Jml Laporan
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    Status
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Dibuat Pada
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-32 text-center"
                                    >
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : pjums.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada data PJUM ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pjums.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            Minggu {item.weekNumber}
                                        </TableCell>
                                        <TableCell>{item.branchName}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {item.bmsName}
                                            </div>
                                            <div className="text-muted-foreground text-[10px]">
                                                {item.bmsNIK}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(item.fromDate)} -{" "}
                                            {formatDate(item.toDate)}
                                        </TableCell>
                                        <TableCell>
                                            {item.reportCount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`font-normal ${getStatusColor(item.status)}`}
                                            >
                                                {getStatusLabel(item.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(
                                                new Date(item.createdAt),
                                                "dd MMM yyyy HH:mm",
                                                { locale: id },
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Infinite Scroll Target */}
                {nextCursor && !isLoading && (
                    <div
                        ref={observerTarget}
                        className="py-4 flex justify-center border-t"
                    >
                        {isFetchingNextPage ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="h-5" /> // Spacer
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
