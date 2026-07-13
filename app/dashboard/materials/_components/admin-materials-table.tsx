"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, Loader2, Search } from "lucide-react";
import {
    getAdminMaterials,
    AdminMaterialFilters,
    MaterialRow,
} from "../actions";
import { toast } from "sonner";
import {
    Filters,
    type Filter,
    type FilterFieldConfig,
} from "@/components/reui/filters";

function formatRp(n: number | null | undefined) {
    if (n === null || n === undefined) return "-";
    return `Rp ${n.toLocaleString("id-ID")}`;
}

function getMaterialRowKey(item: MaterialRow) {
    return [
        item.reportNumber,
        item.materialName,
        item.quantity,
        item.unit,
        item.price,
        item.totalPrice,
    ].join("::");
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

    const [search, setSearch] = useState("");
    const [activeFilters, setActiveFilters] = useState<Filter<string>[]>([]);

    const observerTarget = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const filterFields = useMemo<FilterFieldConfig<string>[]>(
        () => [
            {
                key: "branchName",
                label: "Cabang",
                type: "select",
                placeholder: "Pilih cabang",
                icon: <Building2 className="h-3.5 w-3.5" />,
                options: branches.map((branch) => ({
                    value: branch,
                    label: branch,
                })),
            },
        ],
        [branches],
    );

    const getFilterValue = useCallback(
        (key: string) =>
            activeFilters.find((filter) => filter.field === key)?.values[0] ?? "",
        [activeFilters],
    );

    const searchValue = search.trim();
    const branchName = String(getFilterValue("branchName"));
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminMaterialFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminMaterials(cursor, 20, filters);

                if (isInitial) {
                    setMaterials(res.materials);
                    setTotalUniqueCount(res.totalUniqueCount || 0);
                } else {
                    setMaterials((prev) => {
                        const existing = new Set(prev.map(getMaterialRowKey));
                        return [
                            ...prev,
                            ...res.materials.filter(
                                (item) => !existing.has(getMaterialRowKey(item)),
                            ),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data material");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [searchValue, branchName],
    );

    const resetFilters = useCallback(() => {
        setSearch("");
        setActiveFilters([]);
    }, []);

    // Initial load when filters change (debounced for text inputs)
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            loadData(null, true);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [searchValue, branchName, loadData]);

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
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="text-foreground font-medium">
                        {totalUniqueCount}
                    </span>{" "}
                    material unik dari laporan selesai PJUM
                </div>
                {hasActiveFilter && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={resetFilters}
                    >
                        Reset Filter
                    </Button>
                )}
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari laporan, toko, material, BMS..."
                        className="h-8 bg-white pl-8 text-xs"
                    />
                </div>
                <Filters
                    filters={activeFilters}
                    fields={filterFields}
                    onChange={setActiveFilters}
                    size="sm"
                    allowMultiple={false}
                    className="w-full flex-1"
                    i18n={{
                        addFilter: "Filter",
                        searchFields: "Cari filter...",
                    }}
                />
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table scrollObserverRef={observerTarget} className="text-xs">
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
                                materials.map((item) => (
                                    <TableRow
                                        key={getMaterialRowKey(item)}
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
                    <div className="py-4 flex justify-center border-t">
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
