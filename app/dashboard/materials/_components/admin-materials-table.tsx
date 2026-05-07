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
import {
    getAdminMaterials,
    AdminMaterialFilters,
    MaterialRow,
} from "../actions";
import { toast } from "sonner";

function formatRp(n: number | null | undefined) {
    if (n === null || n === undefined) return "-";
    return `Rp ${n.toLocaleString("id-ID")}`;
}

export function AdminMaterialsTable({
    initialData,
    initialNextCursor,
    initialTotalUniqueCount,
    branches,
}: {
    initialData: MaterialRow[];
    initialNextCursor: string | null;
    initialTotalUniqueCount: number;
    branches: string[];
}) {
    const [materials, setMaterials] = useState<MaterialRow[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalUniqueCount, setTotalUniqueCount] = useState<number>(initialTotalUniqueCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [bmsQuery, setBmsQuery] = useState("");
    const [branchName, setBranchName] = useState("all");

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminMaterialFilters = {
                search: search || undefined,
                bmsQuery: bmsQuery || undefined,
                branchName: branchName === "all" ? undefined : branchName,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminMaterials(cursor, 20, filters);

                if (isInitial) {
                    setMaterials(res.materials);
                    setTotalUniqueCount(res.totalUniqueCount || 0);
                } else {
                    setMaterials((prev) => [...prev, ...res.materials]);
                }
                setNextCursor(res.nextCursor);
            } catch (error) {
                toast.error("Gagal memuat data material");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [search, bmsQuery, branchName],
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
    }, [search, bmsQuery, branchName, loadData]);

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
                    Total <span className="text-foreground font-medium">{totalUniqueCount}</span>{" "}
                    material unik
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="relative flex-[2] min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Cari Laporan / Toko / Nama Material..."
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
                                <TableHead className="min-w-[100px]">
                                    No. Laporan
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Toko
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    BMS
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    Nama Material
                                </TableHead>
                                <TableHead className="w-[80px]">Qty</TableHead>
                                <TableHead className="w-[80px]">
                                    Satuan
                                </TableHead>
                                <TableHead className="min-w-[100px]">
                                    Harga
                                </TableHead>
                                <TableHead className="min-w-[100px]">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-32 text-center"
                                    >
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : materials.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada data material ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materials.map((item, index) => (
                                    <TableRow
                                        key={`${item.reportNumber}-${index}`}
                                    >
                                        <TableCell className="font-medium">
                                            {item.reportNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {item.storeName}
                                            </div>
                                            <div className="text-muted-foreground text-[10px]">
                                                {item.storeCode}
                                            </div>
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
                                            {item.materialName}
                                        </TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>
                                            {formatRp(item.price)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatRp(item.totalPrice)}
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
