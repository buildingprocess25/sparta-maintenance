"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Loader2,
    Plus,
    Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import {
    createDashboardPjum,
    searchDashboardPjumCandidates,
    type DashboardPjumBmsUser,
    type DashboardPjumCandidateRow,
    type DashboardPjumCandidateResult,
} from "../actions";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";

type CreatePjumDialogProps = {
    bmsUsers: DashboardPjumBmsUser[];
};

function toDateInputValue(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function getDefaultDateRange() {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 6);

    return {
        from: toDateInputValue(from),
        to: toDateInputValue(today),
    };
}

function formatDate(iso: string | null) {
    if (!iso) return "-";
    return format(new Date(iso), "dd MMM yyyy", { locale: id });
}

function formatCurrency(value: number) {
    return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export function CreatePjumDialog({ bmsUsers }: CreatePjumDialogProps) {
    const defaultRange = useMemo(() => getDefaultDateRange(), []);
    const [open, setOpen] = useState(false);
    const [bmsNIK, setBmsNIK] = useState(bmsUsers[0]?.NIK ?? "");
    const [from, setFrom] = useState(defaultRange.from);
    const [to, setTo] = useState(defaultRange.to);
    const [weekNumber, setWeekNumber] = useState("1");
    const [result, setResult] = useState<DashboardPjumCandidateResult | null>(
        null,
    );
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [isSearching, startSearchTransition] = useTransition();
    const [isCreating, startCreateTransition] = useTransition();

    const selectedSet = useMemo(
        () => new Set(selectedReports),
        [selectedReports],
    );
    const validRows = result?.rows.filter((row) => row.isValid) ?? [];
    const selectedRows =
        result?.rows.filter((row) => selectedSet.has(row.reportNumber)) ?? [];
    const selectedTotal = selectedRows.reduce(
        (sum, row) => sum + row.totalRealisasi,
        0,
    );
    const allValidSelected =
        validRows.length > 0 &&
        validRows.every((row) => selectedSet.has(row.reportNumber));

    const canSearch = bmsNIK.length > 0 && from.length > 0 && to.length > 0;
    const canCreate =
        selectedReports.length > 0 && !isCreating && !isSearching && !!result;

    function handleSearch() {
        if (!canSearch) {
            toast.error("Pilih BMS dan periode terlebih dahulu");
            return;
        }

        startSearchTransition(async () => {
            try {
                const nextResult = await searchDashboardPjumCandidates({
                    bmsNIK,
                    from,
                    to,
                });
                setResult(nextResult);
                setSelectedReports(
                    nextResult.rows
                        .filter((row) => row.isValid)
                        .map((row) => row.reportNumber),
                );
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengecek laporan PJUM",
                );
            }
        });
    }

    function toggleReport(row: DashboardPjumCandidateRow) {
        if (!row.isValid) return;

        setSelectedReports((current) =>
            current.includes(row.reportNumber)
                ? current.filter((item) => item !== row.reportNumber)
                : [...current, row.reportNumber],
        );
    }

    function toggleAllValid() {
        if (allValidSelected) {
            setSelectedReports([]);
            return;
        }

        setSelectedReports(validRows.map((row) => row.reportNumber));
    }

    function handleCreate() {
        if (!canCreate) {
            toast.error("Pilih minimal 1 laporan valid");
            return;
        }

        startCreateTransition(async () => {
            const response = await createDashboardPjum({
                reportNumbers: selectedReports,
                bmsNIK,
                from,
                to,
                weekNumber: Number(weekNumber),
            });

            if (response.error) {
                toast.error(response.error);
                return;
            }

            toast.success("PJUM berhasil dibuat dan menunggu review BNM");
            window.dispatchEvent(new CustomEvent("dashboard-pjum-created"));
            setOpen(false);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus data-icon="inline-start" />
                    Buat PJUM
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[86vh] max-h-[720px] min-h-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="shrink-0 border-b px-4 py-3">
                    <DialogTitle>Buat PJUM</DialogTitle>
                    <DialogDescription>
                        Pilih periode, cek laporan selesai, lalu centang laporan
                        valid yang akan masuk PJUM.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
                    <section className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_150px_150px_100px_auto] md:items-end">
                        <Field label="BMS">
                            <Select
                                value={bmsNIK}
                                onValueChange={(value) => {
                                    setBmsNIK(value);
                                    setResult(null);
                                    setSelectedReports([]);
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Pilih BMS" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bmsUsers.map((bms) => (
                                        <SelectItem
                                            key={bms.NIK}
                                            value={bms.NIK}
                                        >
                                            {bms.name} ({bms.NIK})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Dari">
                            <Input
                                type="date"
                                value={from}
                                onChange={(event) => {
                                    setFrom(event.target.value);
                                    setResult(null);
                                    setSelectedReports([]);
                                }}
                            />
                        </Field>
                        <Field label="Sampai">
                            <Input
                                type="date"
                                value={to}
                                onChange={(event) => {
                                    setTo(event.target.value);
                                    setResult(null);
                                    setSelectedReports([]);
                                }}
                            />
                        </Field>
                        <Field label="Minggu">
                            <Select
                                value={weekNumber}
                                onValueChange={setWeekNumber}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((week) => (
                                        <SelectItem
                                            key={week}
                                            value={String(week)}
                                        >
                                            Minggu {week}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSearch}
                            disabled={!canSearch || isSearching}
                            className="h-9"
                        >
                            {isSearching ? (
                                <Loader2
                                    className="animate-spin"
                                    data-icon="inline-start"
                                />
                            ) : (
                                <Search data-icon="inline-start" />
                            )}
                            Cek Laporan
                        </Button>
                    </section>

                    {result ? (
                        <section className="space-y-2 border-y bg-muted/20 px-1 py-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                <span className="font-medium text-foreground">
                                    Ringkasan
                                </span>
                                <SummaryItem
                                    label="Valid"
                                    value={`${result.eligibleCount} laporan`}
                                    className="text-emerald-700"
                                />
                                <SummaryItem
                                    label="Tidak valid"
                                    value={`${result.blockedCount} laporan`}
                                    className="text-amber-700"
                                />
                                <SummaryItem
                                    label="Total valid"
                                    value={formatCurrency(
                                        result.eligibleTotalRealisasi,
                                    )}
                                    className="text-blue-700"
                                />
                                <SummaryItem
                                    label="Dipilih"
                                    value={`${selectedReports.length} laporan / ${formatCurrency(selectedTotal)}`}
                                    className="text-foreground"
                                />
                            </div>
                            {result.unfinishedCount > 0 ? (
                                <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                                    <AlertTriangle className="size-3.5" />
                                    Terdapat {result.unfinishedCount} laporan
                                    belum selesai pada periode ini. Minta BMS
                                    menyelesaikan laporan tersebut sebelum masuk
                                    PJUM.
                                </div>
                            ) : null}
                        </section>
                    ) : null}

                    <section className="flex min-h-0 flex-1 flex-col rounded-md border">
                        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <CalendarDays className="size-4 text-primary" />
                                Laporan Periode
                            </div>
                            {result ? (
                                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground has-disabled:cursor-not-allowed has-disabled:opacity-50">
                                    <Checkbox
                                        checked={allValidSelected}
                                        disabled={validRows.length === 0}
                                        onCheckedChange={toggleAllValid}
                                        aria-label="Pilih semua laporan valid"
                                    />
                                    Pilih semua valid
                                </label>
                            ) : null}
                        </div>

                        {!result ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                Pilih periode lalu klik Cek Laporan untuk
                                melihat laporan yang bisa dimasukkan ke PJUM.
                            </div>
                        ) : result.rows.length === 0 ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                Tidak ada laporan pada periode yang dipilih.
                            </div>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="h-8">
                                            <TableHead className="w-9 px-2 py-1" />
                                            <TableHead className="px-2 py-1 text-xs">
                                                Laporan
                                            </TableHead>
                                            <TableHead className="px-2 py-1 text-xs">
                                                Toko
                                            </TableHead>
                                            <TableHead className="px-2 py-1 text-xs">
                                                Status
                                            </TableHead>
                                            <TableHead className="px-2 py-1 text-xs">
                                                Selesai
                                            </TableHead>
                                            <TableHead className="px-2 py-1 text-right text-xs">
                                                Realisasi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.rows.map((row) => (
                                            <TableRow
                                                key={row.reportNumber}
                                                className={cn(
                                                    "h-10 align-middle text-xs",
                                                    !row.isValid &&
                                                        "bg-muted/25 text-muted-foreground",
                                                )}
                                            >
                                                <TableCell className="px-2 py-1">
                                                    <Checkbox
                                                        checked={selectedSet.has(
                                                            row.reportNumber,
                                                        )}
                                                        disabled={!row.isValid}
                                                        onCheckedChange={() =>
                                                            toggleReport(row)
                                                        }
                                                        aria-label={`Pilih laporan ${row.reportNumber}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-2 py-1 font-medium">
                                                    {row.reportNumber}
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    <div className="max-w-52 truncate">
                                                        {row.storeName}
                                                    </div>
                                                    <div className="text-[11px] leading-tight text-muted-foreground">
                                                        {row.storeCode ?? "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    {row.isValid ? (
                                                        <Badge className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[11px] text-emerald-700 hover:bg-emerald-50">
                                                            <CheckCircle2 data-icon="inline-start" />
                                                            Valid
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "h-5 px-1.5 text-[11px]",
                                                                getReportStatusBadgeClass(
                                                                    row.status,
                                                                ),
                                                            )}
                                                        >
                                                            {row.invalidReason ??
                                                                getReportStatusLabel(
                                                                    row.status,
                                                                )}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-2 py-1">
                                                    {formatDate(row.finishedAt)}
                                                </TableCell>
                                                <TableCell className="px-2 py-1 text-right font-medium">
                                                    {formatCurrency(
                                                        row.totalRealisasi,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </section>
                </div>

                <DialogFooter className="shrink-0 border-t bg-background px-4 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCreate}
                        disabled={!canCreate}
                    >
                        {isCreating ? (
                            <Loader2
                                className="animate-spin"
                                data-icon="inline-start"
                            />
                        ) : (
                            <Plus data-icon="inline-start" />
                        )}
                        Buat PJUM
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    children,
    label,
}: {
    children: React.ReactNode;
    label: string;
}) {
    return (
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            {label}
            {children}
        </label>
    );
}

function SummaryItem({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span>{label}</span>
            <span className={cn("font-semibold", className)}>{value}</span>
        </span>
    );
}
