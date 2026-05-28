"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Building2,
    CalendarDays,
    CircleDot,
    ExternalLink,
    Loader2,
    RotateCcw,
    Search,
} from "lucide-react";
import {
    cancelAdminPjum,
    getAdminPjum,
    AdminPjumFilters,
    PjumRow,
} from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
    Filters,
    type Filter,
    type FilterFieldConfig,
} from "@/components/reui/filters";
import {
    getPjumStatusBadgeClass,
    getPjumStatusLabel,
    PJUM_STATUS_OPTIONS,
} from "@/lib/pjum-status";

function formatDate(date: Date) {
    return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function buildPjumViewUrl(item: PjumRow) {
    if (item.pjumFinalDriveUrl) return item.pjumFinalDriveUrl;

    const search = new URLSearchParams({
        ids: item.reportNumbers.join(","),
        bmsNIK: item.bmsNIK,
        from: new Date(item.fromDate).toISOString(),
        to: new Date(item.toDate).toISOString(),
        week: String(item.weekNumber),
    });

    return `/api/reports/pjum-pdf?${search.toString()}`;
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
    const router = useRouter();
    const [pjums, setPjums] = useState<PjumRow[]>(initialData);
    const [nextCursor, setNextCursor] = useState<string | null>(
        initialNextCursor,
    );
    const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [pjumToCancel, setPjumToCancel] = useState<PjumRow | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

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
            {
                key: "status",
                label: "Status",
                type: "select",
                placeholder: "Pilih status",
                icon: <CircleDot className="h-3.5 w-3.5" />,
                options: PJUM_STATUS_OPTIONS,
            },
            {
                key: "fromDate",
                label: "Dari",
                type: "date",
                icon: <CalendarDays className="h-3.5 w-3.5" />,
            },
            {
                key: "toDate",
                label: "Sampai",
                type: "date",
                icon: <CalendarDays className="h-3.5 w-3.5" />,
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
    const status = String(getFilterValue("status"));
    const fromDate = String(getFilterValue("fromDate"));
    const toDate = String(getFilterValue("toDate"));
    const hasActiveFilter = searchValue.length > 0 || activeFilters.length > 0;

    const loadData = useCallback(
        async (cursor: string | null, isInitial: boolean = false) => {
            const filters: AdminPjumFilters = {
                search: searchValue || undefined,
                branchName: branchName || undefined,
                status: status || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            };

            try {
                if (isInitial) setIsLoading(true);
                else setIsFetchingNextPage(true);

                const res = await getAdminPjum(cursor, 20, filters);

                if (isInitial) {
                    setPjums(res.pjums);
                    setTotalCount(res.totalCount);
                } else {
                    setPjums((prev) => {
                        const existing = new Set(prev.map((item) => item.id));
                        return [
                            ...prev,
                            ...res.pjums.filter(
                                (item) => !existing.has(item.id),
                            ),
                        ];
                    });
                }
                setNextCursor(res.nextCursor);
            } catch {
                toast.error("Gagal memuat data PJUM");
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [searchValue, branchName, status, fromDate, toDate],
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
    }, [searchValue, branchName, status, fromDate, toDate, loadData]);

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

    const handleCancelPjum = async () => {
        if (!pjumToCancel) return;

        setIsCancelling(true);
        try {
            const result = await cancelAdminPjum(pjumToCancel.id);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            setPjums((prev) =>
                prev.filter((item) => item.id !== pjumToCancel.id),
            );
            setTotalCount((prev) => Math.max(0, prev - 1));
            toast.success(
                `PJUM dibatalkan. ${result.updatedReports ?? 0} laporan dapat dibuat PJUM ulang.`,
            );
            setPjumToCancel(null);
            router.refresh();
        } catch {
            toast.error("Gagal membatalkan PJUM");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Total{" "}
                    <span className="text-foreground font-medium">
                        {totalCount}
                    </span>{" "}
                    PJUM
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
                        placeholder="Cari BMS, NIK, cabang, no laporan..."
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
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="min-w-[180px]">
                                    Minggu / Periode
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Cabang
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                    BMS
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
                                <TableHead className="w-[140px]">
                                    Dokumen
                                </TableHead>
                                <TableHead className="w-[120px] text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
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
                                        colSpan={8}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Tidak ada data PJUM ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pjums.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                Minggu {item.weekNumber}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {formatDate(item.fromDate)} -{" "}
                                                {formatDate(item.toDate)}
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
                                            {item.reportCount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`font-normal ${getPjumStatusBadgeClass(item.status)}`}
                                            >
                                                {getPjumStatusLabel(
                                                    item.status,
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(
                                                new Date(item.createdAt),
                                                "dd MMM yyyy HH:mm",
                                                { locale: id },
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                asChild
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5 bg-white text-xs"
                                            >
                                                <a
                                                    href={buildPjumViewUrl(item)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label={`Lihat PDF PJUM minggu ${item.weekNumber}`}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Lihat PDF
                                                </a>
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Batalkan PJUM minggu ${item.weekNumber}`}
                                                    title={
                                                        item.status ===
                                                        "APPROVED"
                                                            ? "PJUM yang sudah disetujui tidak dapat dibatalkan"
                                                            : "Batalkan PJUM"
                                                    }
                                                    onClick={() =>
                                                        setPjumToCancel(item)
                                                    }
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Batalkan
                                                </Button>
                                            </div>
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

            <AlertDialog
                open={!!pjumToCancel}
                onOpenChange={(open) => {
                    if (!open && !isCancelling) setPjumToCancel(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan PJUM?</AlertDialogTitle>
                        <AlertDialogDescription>
                            PJUM minggu {pjumToCancel?.weekNumber} untuk{" "}
                            {pjumToCancel?.bmsName} akan dihapus dari daftar
                            PJUM. Status PJUM pada{" "}
                            {pjumToCancel?.reportCount ?? 0} laporan terkait
                            akan dikosongkan agar laporan tersebut bisa masuk
                            PJUM ulang.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isCancelling}
                            onClick={(event) => {
                                event.preventDefault();
                                handleCancelPjum();
                            }}
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Membatalkan...
                                </>
                            ) : (
                                "Batalkan PJUM"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
