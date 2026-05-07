"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
import { Loader2, Search } from "lucide-react";
import { PreventiveRow, getAdminPreventive } from "../actions";
import { Badge } from "@/components/ui/badge";

const preventiveDateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

function formatPreventiveDate(value: string) {
    return preventiveDateFormatter.format(new Date(value));
}

function formatBmsLabel(info: NonNullable<PreventiveRow["q1"]>) {
    return info.bmsName || "-";
}

export function AdminPreventiveTable({
    initialData,
    initialNextCursor,
    initialTotalCount,
    branches,
    availableYears,
    defaultBranch,
}: {
    initialData: PreventiveRow[];
    initialNextCursor: string | null;
    initialTotalCount: number;
    branches: string[];
    availableYears: number[];
    defaultBranch: string;
}) {
    const currentYear = new Date().getFullYear();
    const [data, setData] = useState<PreventiveRow[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState(initialTotalCount);

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [branchName, setBranchName] = useState<string>(defaultBranch);
    const [year, setYear] = useState<number>(currentYear);

    const observer = useRef<IntersectionObserver | null>(null);

    const loadMore = useCallback(async () => {
        if (!nextCursor || isFetchingMore) return;

        setIsFetchingMore(true);
        try {
            const result = await getAdminPreventive(nextCursor, 20, {
                search,
                branchName,
                year,
            });
            setData((prev) => [...prev, ...result.rows]);
            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error("Failed to load more:", error);
        } finally {
            setIsFetchingMore(false);
        }
    }, [nextCursor, isFetchingMore, search, branchName, year]);

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

    // Filter effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const result = await getAdminPreventive(null, 20, {
                    search,
                    branchName,
                    year,
                });
                setData(result.rows);
                setNextCursor(result.nextCursor);
                setTotalCount(result.totalCount);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, branchName, year]);

    const renderQuarterCell = (info: PreventiveRow["q1"]) =>
        info ? (
            <div className="inline-flex flex-col items-center">
                <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 font-normal text-xs h-5"
                >
                    {formatPreventiveDate(info.doneAt)} - {formatBmsLabel(info)}
                </Badge>
            </div>
        ) : (
            <span className="text-muted-foreground">-</span>
        );

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari Kode / Nama Toko..."
                        className="pl-8 bg-background h-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={branchName} onValueChange={setBranchName}>
                    <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm bg-background">
                        <SelectValue placeholder="Semua Cabang" />
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
                <Select
                    value={year.toString()}
                    onValueChange={(val) => setYear(parseInt(val))}
                >
                    <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm bg-background">
                        <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border bg-card flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[50px] font-semibold text-[11px]">
                                    No
                                </TableHead>
                                <TableHead className="min-w-[200px] font-semibold text-[11px]">
                                    Toko
                                </TableHead>
                                <TableHead className="min-w-[120px] font-semibold text-center whitespace-pre-wrap text-[11px]">
                                    {"Triwulan 1\n(Jan-Mar)"}
                                </TableHead>
                                <TableHead className="min-w-[120px] font-semibold text-center whitespace-pre-wrap text-[11px]">
                                    {"Triwulan 2\n(Apr-Jun)"}
                                </TableHead>
                                <TableHead className="min-w-[120px] font-semibold text-center whitespace-pre-wrap text-[11px]">
                                    {"Triwulan 3\n(Jul-Sep)"}
                                </TableHead>
                                <TableHead className="min-w-[120px] font-semibold text-center whitespace-pre-wrap text-[11px]">
                                    {"Triwulan 4\n(Okt-Des)"}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                    >
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center text-muted-foreground text-[11px]"
                                    >
                                        Tidak ada toko yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item, index) => {
                                    const isLast = index === data.length - 1;
                                    return (
                                        <TableRow
                                            key={item.storeCode}
                                            ref={isLast ? lastRowRef : null}
                                        >
                                            <TableCell className="text-muted-foreground text-[11px]">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="text-[11px]">
                                                <div className="font-medium">
                                                    {item.storeName}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {item.storeCode} •{" "}
                                                    {item.branchName}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-[11px]">
                                                {renderQuarterCell(item.q1)}
                                            </TableCell>
                                            <TableCell className="text-center text-[11px]">
                                                {renderQuarterCell(item.q2)}
                                            </TableCell>
                                            <TableCell className="text-center text-[11px]">
                                                {renderQuarterCell(item.q3)}
                                            </TableCell>
                                            <TableCell className="text-center text-[11px]">
                                                {renderQuarterCell(item.q4)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                            {isFetchingMore && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-14 text-center"
                                    >
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                        Menampilkan {data.length} dari {totalCount} Toko
                    </div>
                </div>
            </div>
        </div>
    );
}
