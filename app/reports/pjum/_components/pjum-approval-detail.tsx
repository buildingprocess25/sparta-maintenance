"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    CreditCard,
    FileText,
    Building2,
    User,
    CalendarDays,
    Hash,
    AlertTriangle,
    X,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    approvePjumExport,
    rejectPjumExport,
    type PjumExportDetail as PjumExportDetailType,
    type BankAccountOption,
} from "../approval-actions";

const MONTHS = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

function fmtCurrency(amount: number): string {
    return Number(amount).toLocaleString("id-ID");
}

type Props = {
    detail: PjumExportDetailType;
    bankAccounts: BankAccountOption[];
};

export function PjumApprovalDetail({ detail, bankAccounts }: Props) {
    const router = useRouter();
    const [isApproving, startApproveTransition] = useTransition();
    const [isRejecting, startRejectTransition] = useTransition();
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionNotes, setRejectionNotes] = useState("");

    // PUM form state — auto-filled from PJUM data
    const fromDate = new Date(detail.fromDate);
    const [bankAccountNo, setBankAccountNo] = useState("");
    const [bankAccountName, setBankAccountName] = useState("");
    const [bankName, setBankName] = useState("");
    const [isAccountNameFocused, setIsAccountNameFocused] = useState(false);

    const filteredBankAccounts = bankAccounts.filter(
        (acc) =>
            acc.bankAccountName
                .toLowerCase()
                .includes(bankAccountName.toLowerCase()) ||
            acc.bankAccountNo.includes(bankAccountName),
    );
    const [pumWeekNumber, setPumWeekNumber] = useState(detail.weekNumber);
    const [pumMonth, setPumMonth] = useState(
        fromDate.toLocaleString("id-ID", { month: "long" }),
    );
    const [pumYear, setPumYear] = useState(fromDate.getFullYear());

    // Keperluan text — matches format used in PUM form PDF
    const keperluanText = `Biaya Perbaikan toko minggu ke ${pumWeekNumber} Bulan ${pumMonth} ${pumYear} untuk 1 BMS`;

    function clearAllBankFields() {
        setBankAccountName("");
        setBankAccountNo("");
        setBankName("");
    }

    function handleApprove() {
        if (
            !bankAccountNo.trim() ||
            !bankAccountName.trim() ||
            !bankName.trim()
        ) {
            toast.error("Informasi rekening wajib diisi");
            return;
        }
        // PUM validation removed (feature disabled)

        startApproveTransition(async () => {
            const result = await approvePjumExport({
                pjumExportId: detail.id,
                bankAccountNo: bankAccountNo.trim(),
                bankAccountName: bankAccountName.trim(),
                bankName: bankName.trim(),
                // PUM fields no longer required (feature disabled)
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(
                    "PJUM disetujui! PDF telah diupload ke Google Drive.",
                );
                router.push("/reports/pjum");
            }
        });
    }

    function handleReject() {
        startRejectTransition(async () => {
            const result = await rejectPjumExport({
                pjumExportId: detail.id,
                notes: rejectionNotes.trim(),
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("PJUM berhasil ditolak.");
                router.push("/reports/pjum");
            }
        });
        setShowRejectDialog(false);
    }

    const selisih = 1_000_000 - detail.totalExpenditure;
    const periode = `${format(fromDate, "d MMM", { locale: localeId })} – ${format(new Date(detail.toDate), "d MMM yyyy", { locale: localeId })}`;
    const isPending = detail.status === "PENDING_APPROVAL";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Detail PJUM"
                description="Tinjau laporan dan isi informasi PUM untuk menyetujui"
                showBackButton
                backHref="/reports/pjum"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* ── LEFT COLUMN (3/5) ─────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* PJUM Info Card */}
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Informasi PJUM
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Data paket laporan minggu{" "}
                                        {detail.weekNumber}
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/api/reports/pjum-pdf?ids=${detail.reportNumbers.join(",")}&bmsNIK=${detail.bmsNIK}&from=${detail.fromDate}&to=${detail.toDate}&week=${detail.weekNumber}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Lihat Laporan Lengkap
                                    </a>
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Info rows */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                                        <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                BMS
                                            </p>
                                            <p className="font-semibold mt-0.5 truncate">
                                                {detail.bmsName}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                NIK: {detail.bmsNIK}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                                        <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Dibuat oleh BMC
                                            </p>
                                            <p className="font-semibold mt-0.5 truncate">
                                                {detail.createdByName}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                NIK: {detail.createdByNIK}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Cabang
                                            </p>
                                            <p className="font-semibold mt-0.5 truncate">
                                                {detail.branchName}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                                        <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Periode
                                            </p>
                                            <p className="font-semibold mt-0.5">
                                                {periode}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 sm:col-span-2">
                                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                                Minggu ke
                                            </p>
                                            <p className="font-semibold mt-0.5">
                                                Minggu ke-{detail.weekNumber}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial summary */}
                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-center">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
                                            UM
                                        </p>
                                        <p className="font-bold text-blue-700 dark:text-blue-300 mt-1 text-sm">
                                            Rp {fmtCurrency(1_000_000)}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-center">
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wide">
                                            Total Pengeluaran
                                        </p>
                                        <p className="font-bold text-amber-800 dark:text-amber-300 mt-1 text-sm">
                                            Rp{" "}
                                            {fmtCurrency(
                                                detail.totalExpenditure,
                                            )}
                                        </p>
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg text-center border ${
                                            selisih < 0
                                                ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50"
                                                : "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50"
                                        }`}
                                    >
                                        <p
                                            className={`text-xs font-medium uppercase tracking-wide ${selisih < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                                        >
                                            Selisih
                                        </p>
                                        <p
                                            className={`font-bold mt-1 text-sm ${selisih < 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}
                                        >
                                            {selisih >= 0
                                                ? `Rp ${fmtCurrency(selisih)}`
                                                : `(Rp ${fmtCurrency(Math.abs(selisih))})`}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reports Table Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Daftar Laporan
                                    <Badge variant="secondary">
                                        {detail.reports.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 md:p-6 md:pt-0">
                                {/* Mobile card list */}
                                <div className="md:hidden divide-y">
                                    {detail.reports.map((r, i) => (
                                        <div
                                            key={r.reportNumber}
                                            className="px-4 py-3 flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {i + 1}.{" "}
                                                    {r.storeCode
                                                        ? `${r.storeCode} — `
                                                        : ""}
                                                    {r.storeName}
                                                </p>
                                                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                                    {r.reportNumber}
                                                </p>
                                            </div>
                                            <span className="text-sm font-medium whitespace-nowrap">
                                                Rp{" "}
                                                {fmtCurrency(r.totalRealisasi)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
                                        <span className="font-semibold text-sm">
                                            Total
                                        </span>
                                        <span className="font-semibold text-sm">
                                            Rp{" "}
                                            {fmtCurrency(
                                                detail.totalExpenditure,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="w-12">
                                                    No
                                                </TableHead>
                                                <TableHead>
                                                    No Laporan
                                                </TableHead>
                                                <TableHead>Toko</TableHead>
                                                <TableHead className="text-right">
                                                    Realisasi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detail.reports.map((r, i) => (
                                                <TableRow key={r.reportNumber}>
                                                    <TableCell>
                                                        {i + 1}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {r.reportNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.storeCode
                                                            ? `${r.storeCode} — `
                                                            : ""}
                                                        {r.storeName}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        Rp{" "}
                                                        {fmtCurrency(
                                                            r.totalRealisasi,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/30 font-semibold">
                                                <TableCell
                                                    colSpan={3}
                                                    className="text-right"
                                                >
                                                    Total Realisasi
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rp{" "}
                                                    {fmtCurrency(
                                                        detail.totalExpenditure,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── RIGHT COLUMN (2/5) ───────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        {isPending ? (
                            <Card className="border-primary/20">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-primary" />
                                        Form PUM — Informasi Transfer
                                    </CardTitle>
                                    <CardDescription>
                                        Isi informasi transfer ke BMS untuk
                                        menyetujui PJUM
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {/* Bank fields */}
                                    <div className="space-y-4">
                                        <div className="space-y-2 relative">
                                            <Label htmlFor="bankAccountName">
                                                Atas Nama{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="bankAccountName"
                                                    value={bankAccountName}
                                                    onFocus={() =>
                                                        setIsAccountNameFocused(
                                                            true,
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        setTimeout(
                                                            () =>
                                                                setIsAccountNameFocused(
                                                                    false,
                                                                ),
                                                            200,
                                                        )
                                                    }
                                                    onChange={(e) =>
                                                        setBankAccountName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Nama pemilik rekening"
                                                    autoComplete="off"
                                                    className={
                                                        bankAccountName
                                                            ? "pr-10"
                                                            : ""
                                                    }
                                                />
                                                {bankAccountName && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            clearAllBankFields
                                                        }
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {isAccountNameFocused &&
                                                filteredBankAccounts.length >
                                                    0 && (
                                                    <ul className="absolute top-full left-0 mt-1 z-50 w-full bg-popover text-popover-foreground border shadow-md rounded-md max-h-60 overflow-auto py-1">
                                                        {filteredBankAccounts.map(
                                                            (acc, i) => (
                                                                <li
                                                                    key={i}
                                                                    className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        setBankAccountName(
                                                                            acc.bankAccountName,
                                                                        );
                                                                        setBankAccountNo(
                                                                            acc.bankAccountNo,
                                                                        );
                                                                        setBankName(
                                                                            acc.bankName,
                                                                        );
                                                                        setIsAccountNameFocused(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    <span className="font-medium">
                                                                        {
                                                                            acc.bankAccountName
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs">
                                                                        {
                                                                            acc.bankName
                                                                        }{" "}
                                                                        -{" "}
                                                                        {
                                                                            acc.bankAccountNo
                                                                        }
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankAccountNo">
                                                No. Rekening{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="bankAccountNo"
                                                    value={bankAccountNo}
                                                    onChange={(e) =>
                                                        setBankAccountNo(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Nomor rekening BMS"
                                                    className={
                                                        bankAccountNo
                                                            ? "pr-10"
                                                            : ""
                                                    }
                                                />
                                                {bankAccountNo && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            clearAllBankFields
                                                        }
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankName">
                                                Nama Bank{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="bankName"
                                                    value={bankName}
                                                    onChange={(e) =>
                                                        setBankName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="BCA / BNI / Mandiri"
                                                    className={
                                                        bankName ? "pr-10" : ""
                                                    }
                                                />
                                                {bankName && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            clearAllBankFields
                                                        }
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PUM feature disabled - per business request */}
                                    {/* <div className="space-y-3 pt-2 border-t">
                                        <Label className="text-sm font-semibold">
                                            Keperluan PUM
                                        </Label>
                                        ... (PUM fields removed)
                                    </div> */}
                                </CardContent>
                            </Card>
                        ) : (
                            /* Already processed status */
                            <Card>
                                <CardContent className="flex items-center gap-3 py-5">
                                    {detail.status === "APPROVED" ? (
                                        <>
                                            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                                            <div>
                                                <p className="text-green-700 dark:text-green-400 font-semibold">
                                                    PJUM Disetujui
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Paket ini sudah diproses
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-6 w-6 text-destructive shrink-0" />
                                            <div>
                                                <p className="text-destructive font-semibold">
                                                    PJUM Ditolak
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Paket ini telah ditolak
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Sticky Bottom Action Bar (only when pending) ────────── */}
            {isPending && (
                <div className="fixed bottom-0 inset-x-0 z-50 bg-background border-t shadow-[0_-12px_12px_-12px_rgba(0,0,0,0.1)]">
                    <div className="container mx-auto px-4 py-5 max-w-7xl flex items-center justify-end gap-4 h-24">
                        <Button
                            variant="destructive"
                            size="lg"
                            className="gap-2"
                            onClick={() => setShowRejectDialog(true)}
                            disabled={isApproving || isRejecting}
                        >
                            <XCircle className="h-4 w-4" />
                            Tolak PJUM
                        </Button>
                        <Button
                            size="lg"
                            className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                            onClick={handleApprove}
                            disabled={isApproving || isRejecting}
                        >
                            {isApproving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Menyetujui...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Setujui PJUM
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Reject Confirmation Dialog ───────────────────────────── */}
            <AlertDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Tolak PJUM?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Laporan dalam
                            paket ini akan dikembalikan ke status siap ekspor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 px-1">
                        <Label htmlFor="rejectionNotes">
                            Catatan penolakan (opsional)
                        </Label>
                        <Textarea
                            id="rejectionNotes"
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            placeholder="Tulis alasan penolakan..."
                            rows={3}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRejecting}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleReject}
                            disabled={isRejecting}
                        >
                            {isRejecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Menolak...
                                </>
                            ) : (
                                "Ya, Tolak PJUM"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Footer />
        </div>
    );
}
