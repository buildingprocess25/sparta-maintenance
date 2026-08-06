"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Loader2,
    Plus,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    getBlockedRangesForBms,
    searchDashboardPjumCandidates,
    type DashboardPjumBlockedRange,
    type DashboardPjumBmsUser,
    type DashboardPjumCandidateRow,
    type DashboardPjumCandidateResult,
} from "../actions";
import {
    getReportStatusBadgeClass,
    getReportStatusLabel,
} from "@/lib/report-status";
import { cn } from "@/lib/utils";
import { formatJakartaDate, getJakartaDayKey, getJakartaDayRange } from "@/lib/time";

type CreatePjumDialogProps = {
    bmsUsers: DashboardPjumBmsUser[];
};

function toDateInputValue(date: Date) {
    return getJakartaDayKey(date);
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
    return formatJakartaDate(iso);
}

function formatCurrency(value: number) {
    return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

const MONTH_OPTIONS = [
    { value: "Januari", label: "Januari" },
    { value: "Februari", label: "Februari" },
    { value: "Maret", label: "Maret" },
    { value: "April", label: "April" },
    { value: "Mei", label: "Mei" },
    { value: "Juni", label: "Juni" },
    { value: "Juli", label: "Juli" },
    { value: "Agustus", label: "Agustus" },
    { value: "September", label: "September" },
    { value: "Oktober", label: "Oktober" },
    { value: "November", label: "November" },
    { value: "Desember", label: "Desember" },
];

function startOfJakartaDay(date: Date): Date {
    return getJakartaDayRange(getJakartaDayKey(date)).start;
}

function findOverlappingRange(
    fromDate: Date,
    toDate: Date,
    ranges: DashboardPjumBlockedRange[],
): DashboardPjumBlockedRange | null {
    const from = startOfJakartaDay(fromDate).getTime();
    const to = startOfJakartaDay(toDate).getTime();

    return (
        ranges.find((range) => {
            const blockedFrom = startOfJakartaDay(
                new Date(range.fromDate),
            ).getTime();
            // Toleransi 1 hari: hari terakhir range lama boleh jadi hari pertama baru.
            const blockedToExclusive = startOfJakartaDay(
                new Date(range.toDate),
            ).getTime();
            return from < blockedToExclusive && to >= blockedFrom;
        }) ?? null
    );
}

export function CreatePjumDialog({ bmsUsers }: CreatePjumDialogProps) {
    const defaultRange = useMemo(() => getDefaultDateRange(), []);
    const [open, setOpen] = useState(false);
    const [bmsNIK, setBmsNIK] = useState(bmsUsers[0]?.NIK ?? "");
    const [from, setFrom] = useState<Date | undefined>(() => {
        const d = new Date(defaultRange.from);
        return isNaN(d.getTime()) ? undefined : d;
    });
    const [to, setTo] = useState<Date | undefined>(() => {
        const d = new Date(defaultRange.to);
        return isNaN(d.getTime()) ? undefined : d;
    });
    const [weekNumber, setWeekNumber] = useState("1");
    const [monthName, setMonthName] = useState<string>("");
    const [result, setResult] = useState<DashboardPjumCandidateResult | null>(
        null,
    );
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [blockedRanges, setBlockedRanges] = useState<DashboardPjumBlockedRange[]>([]);
    const [isLoadingBlockedRanges, setIsLoadingBlockedRanges] = useState(false);
    const blockedRangeRequestRef = useRef(0);
    const [isSearching, startSearchTransition] = useTransition();
    const [isCreating, startCreateTransition] = useTransition();

    async function loadBlockedRanges(nik: string) {
        const requestId = blockedRangeRequestRef.current + 1;
        blockedRangeRequestRef.current = requestId;
        setIsLoadingBlockedRanges(true);

        try {
            const result = await getBlockedRangesForBms(nik);
            if (requestId !== blockedRangeRequestRef.current) return;

            if (result.error) {
                toast.error(result.error);
                setBlockedRanges([]);
                return;
            }

            setBlockedRanges(result.data ?? []);
        } catch {
            if (requestId !== blockedRangeRequestRef.current) return;
            toast.error("Gagal memuat rentang tanggal PJUM yang sudah digunakan");
            setBlockedRanges([]);
        } finally {
            if (requestId !== blockedRangeRequestRef.current) return;
            setIsLoadingBlockedRanges(false);
        }
    }

    const overlappingRange = useMemo(() => {
        if (!from || !to) return null;
        return findOverlappingRange(from, to, blockedRanges);
    }, [from, to, blockedRanges]);

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

    const canSearch =
        bmsNIK.length > 0 &&
        !!from &&
        !!to &&
        !!monthName &&
        !isLoadingBlockedRanges;
    const canCreate =
        selectedReports.length > 0 &&
        !isCreating &&
        !isSearching &&
        !!result &&
        !!monthName;

    function handleSearch() {
        if (!canSearch) {
            toast.error("Pilih BMS, periode, dan bulan terlebih dahulu");
            return;
        }

        startSearchTransition(async () => {
            try {
                const nextResult = await searchDashboardPjumCandidates({
                    bmsNIK,
                    from: getJakartaDayKey(from!),
                    to: getJakartaDayKey(to!),
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
                from: getJakartaDayKey(from!),
                to: getJakartaDayKey(to!),
                weekNumber: Number(weekNumber),
                monthName,
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
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(160px,1fr)_135px_135px_110px_130px_auto] md:items-end">
                        <Field label="BMS">
                            <Select
                                value={bmsNIK}
                                onValueChange={(value) => {
                                    setBmsNIK(value);
                                    setResult(null);
                                    setSelectedReports([]);
                                    setMonthName("");
                                    setBlockedRanges([]);
                                    setIsLoadingBlockedRanges(true);
                                    void loadBlockedRanges(value);
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
                            <DatePickerField
                                label="Dari"
                                value={from}
                                blockedRanges={blockedRanges}
                                onChange={(date) => {
                                    setFrom(date);
                                    setResult(null);
                                    setSelectedReports([]);
                                }}
                            />
                        </Field>
                        <Field label="Sampai">
                            <DatePickerField
                                label="Sampai"
                                value={to}
                                minDate={from}
                                blockedRanges={blockedRanges}
                                onChange={(date) => {
                                    setTo(date);
                                    setResult(null);
                                    setSelectedReports([]);
                                    if (date) {
                                        setMonthName(
                                            MONTH_OPTIONS[date.getMonth()]?.value || "",
                                        );
                                    }
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
                        <Field label="Bulan">
                            <Select
                                value={monthName}
                                onValueChange={(value) => {
                                    setMonthName(value);
                                    setResult(null);
                                    setSelectedReports([]);
                                }}
                            >
                                <SelectTrigger className="h-9 w-full" aria-label="Bulan">
                                    <SelectValue placeholder="Pilih bulan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTH_OPTIONS.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
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

                    {overlappingRange && (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
                            <AlertTriangle className="size-3.5" />
                            Range overlap dengan PJUM sebelumnya (
                            {formatDate(overlappingRange.fromDate)} –{" "}
                            {formatDate(overlappingRange.toDate)}). Laporan yang
                            sudah PJUM tidak akan terpilih.
                        </div>
                    )}

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
                            <div className="min-h-0 flex-1">
                                <Table containerClassName="max-h-[50vh]">
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

function DatePickerField({
    value,
    onChange,
    label,
    minDate,
    blockedRanges,
}: {
    value?: Date;
    onChange: (d: Date) => void;
    label: string;
    minDate?: Date;
    blockedRanges?: DashboardPjumBlockedRange[];
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-left font-normal"
                    aria-label={label}
                >
                    <CalendarDays className="mr-2 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                        {value
                            ? format(value, "dd MMM yyyy", { locale: localeId })
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
                        const day = startOfJakartaDay(d).getTime();
                        if (
                            minDate &&
                            day < startOfJakartaDay(minDate).getTime()
                        )
                            return true;
                        if (blockedRanges) {
                            return blockedRanges.some((range) => {
                                const from = startOfJakartaDay(
                                    new Date(range.fromDate),
                                ).getTime();
                                const toExclusive = startOfJakartaDay(
                                    new Date(range.toDate),
                                ).getTime();
                                return day >= from && day < toExclusive;
                            });
                        }
                        return false;
                    }}
                    locale={localeId}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
