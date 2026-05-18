"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ExternalLink, Loader2, RotateCcw, Search } from "lucide-react";
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
            } catch {
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
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Button
                                                    asChild
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    aria-label={`Lihat PJUM minggu ${item.weekNumber}`}
                                                >
                                                    <a
                                                        href={buildPjumViewUrl(
                                                            item,
                                                        )}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Batalkan PJUM minggu ${item.weekNumber}`}
                                                    disabled={
                                                        item.status ===
                                                        "APPROVED"
                                                    }
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
                                                    <RotateCcw className="h-4 w-4" />
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
                            {pjumToCancel?.bmsName} akan dihapus, dan status
                            PJUM pada {pjumToCancel?.reportCount ?? 0} laporan
                            terkait akan dikosongkan agar bisa dibuat ulang
                            dengan tanggal yang benar.
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
