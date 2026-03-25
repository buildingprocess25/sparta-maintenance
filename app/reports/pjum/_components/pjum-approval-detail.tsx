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
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    approvePjumExport,
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

    // PUM form state — auto-filled from PJUM data
    const fromDate = new Date(detail.fromDate);
    const [bankAccountNo, setBankAccountNo] = useState(
        bankAccounts[0]?.bankAccountNo ?? "",
    );
    const [bankAccountName, setBankAccountName] = useState(
        bankAccounts[0]?.bankAccountName ?? "",
    );
    const [bankName, setBankName] = useState(
        bankAccounts[0]?.bankName ?? "",
    );
    const [pumWeekNumber, setPumWeekNumber] = useState(detail.weekNumber);
    const [pumMonth, setPumMonth] = useState(
        fromDate.toLocaleString("id-ID", { month: "long" }),
    );
    const [pumYear, setPumYear] = useState(fromDate.getFullYear());

    function selectBank(accountId: string) {
        const acct = bankAccounts.find((a) => a.id === accountId);
        if (acct) {
            setBankAccountNo(acct.bankAccountNo);
            setBankAccountName(acct.bankAccountName);
            setBankName(acct.bankName);
        }
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
        if (!pumMonth) {
            toast.error("Bulan PUM wajib dipilih");
            return;
        }

        startApproveTransition(async () => {
            const result = await approvePjumExport({
                pjumExportId: detail.id,
                bankAccountNo: bankAccountNo.trim(),
                bankAccountName: bankAccountName.trim(),
                bankName: bankName.trim(),
                pumWeekNumber,
                pumMonth,
                pumYear,
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

    const selisih = 1_000_000 - detail.totalExpenditure;
    const periode = `${format(fromDate, "d MMM", { locale: localeId })} – ${format(new Date(detail.toDate), "d MMM yyyy", { locale: localeId })}`;

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
            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-4xl pb-24 lg:pb-8 space-y-6">
                {/* ── PJUM Info Card ──────────────────────────────────── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Informasi PJUM
                        </CardTitle>
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
                    <CardContent className="space-y-3 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground flex items-center gap-1.5 mb-0.5">
                                    <User className="h-3.5 w-3.5" />
                                    BMS
                                </span>
                                <p className="font-medium">
                                    {detail.bmsName}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground flex items-center gap-1.5 mb-0.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    NIK BMS
                                </span>
                                <p className="font-medium font-mono">
                                    {detail.bmsNIK}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground flex items-center gap-1.5 mb-0.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Cabang
                                </span>
                                <p className="font-medium">
                                    {detail.branchName}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground mb-0.5 block">
                                    Minggu ke
                                </span>
                                <p className="font-medium">
                                    <Badge variant="outline">
                                        {detail.weekNumber}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground flex items-center gap-1.5 mb-0.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Periode
                                </span>
                                <p className="font-medium">{periode}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground mb-0.5 block">
                                    Dibuat oleh
                                </span>
                                <p className="font-medium">
                                    {detail.createdByName}
                                </p>
                            </div>
                        </div>

                        {/* Financial summary */}
                        <div className="flex flex-wrap gap-4 pt-3 border-t">
                            <div className="text-sm">
                                <span className="text-muted-foreground">
                                    UM:
                                </span>{" "}
                                <span className="font-medium">
                                    Rp {fmtCurrency(1_000_000)}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">
                                    Total Pengeluaran:
                                </span>{" "}
                                <span className="font-medium">
                                    Rp{" "}
                                    {fmtCurrency(detail.totalExpenditure)}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">
                                    Selisih:
                                </span>{" "}
                                <span
                                    className={`font-medium ${selisih < 0 ? "text-destructive" : "text-green-600"}`}
                                >
                                    Rp{" "}
                                    {selisih >= 0
                                        ? fmtCurrency(selisih)
                                        : `(${fmtCurrency(Math.abs(selisih))})`}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Reports Table ───────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Laporan ({detail.reports.length})
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
                                        Rp {fmtCurrency(r.totalRealisasi)}
                                    </span>
                                </div>
                            ))}
                            <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
                                <span className="font-semibold text-sm">
                                    Total
                                </span>
                                <span className="font-semibold text-sm">
                                    Rp{" "}
                                    {fmtCurrency(detail.totalExpenditure)}
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
                                        <TableHead>No Laporan</TableHead>
                                        <TableHead>Toko</TableHead>
                                        <TableHead className="text-right">
                                            Estimasi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detail.reports.map((r, i) => (
                                        <TableRow key={r.reportNumber}>
                                            <TableCell>{i + 1}</TableCell>
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
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="font-semibold text-right"
                                        >
                                            Total
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
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

                {/* ── PUM Form — only show if pending ────────────────── */}
                {detail.status === "PENDING_APPROVAL" && (
                    <Card className="border-primary/30">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Form PUM — Informasi Transfer
                            </CardTitle>
                            <CardDescription>
                                Isi informasi transfer ke BMS dan keperluan
                                PUM
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Bank account auto-fill */}
                            {bankAccounts.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Rekening Tersimpan</Label>
                                    <Select onValueChange={selectBank}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih rekening yang pernah digunakan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((acct) => (
                                                <SelectItem
                                                    key={acct.id}
                                                    value={acct.id}
                                                >
                                                    {acct.bankName} —{" "}
                                                    {acct.bankAccountNo} (
                                                    {acct.bankAccountName})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Bank fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bankAccountNo">
                                        No. Rekening *
                                    </Label>
                                    <Input
                                        id="bankAccountNo"
                                        value={bankAccountNo}
                                        onChange={(e) =>
                                            setBankAccountNo(e.target.value)
                                        }
                                        placeholder="1234567890"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankAccountName">
                                        Atas Nama *
                                    </Label>
                                    <Input
                                        id="bankAccountName"
                                        value={bankAccountName}
                                        onChange={(e) =>
                                            setBankAccountName(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Nama di rekening"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">
                                        Nama Bank *
                                    </Label>
                                    <Input
                                        id="bankName"
                                        value={bankName}
                                        onChange={(e) =>
                                            setBankName(e.target.value)
                                        }
                                        placeholder="BCA / BNI / Mandiri"
                                    />
                                </div>
                            </div>

                            {/* PUM keperluan fields */}
                            <div className="border-t pt-4">
                                <Label className="text-sm font-semibold mb-3 block">
                                    Keperluan PUM
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pumWeekNumber">
                                            Minggu ke *
                                        </Label>
                                        <Select
                                            value={String(pumWeekNumber)}
                                            onValueChange={(v) =>
                                                setPumWeekNumber(Number(v))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map(
                                                    (w) => (
                                                        <SelectItem
                                                            key={w}
                                                            value={String(
                                                                w,
                                                            )}
                                                        >
                                                            Minggu {w}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pumMonth">
                                            Bulan *
                                        </Label>
                                        <Select
                                            value={pumMonth}
                                            onValueChange={setPumMonth}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih bulan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((m) => (
                                                    <SelectItem
                                                        key={m}
                                                        value={m}
                                                    >
                                                        {m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pumYear">
                                            Tahun *
                                        </Label>
                                        <Input
                                            id="pumYear"
                                            type="number"
                                            min={2024}
                                            max={2099}
                                            value={pumYear}
                                            onChange={(e) =>
                                                setPumYear(
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                >
                                    {isApproving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Menyetujui...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Setujui PJUM
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Already processed status ───────────────────────── */}
                {detail.status !== "PENDING_APPROVAL" && (
                    <Card>
                        <CardContent className="flex items-center gap-2 py-4">
                            {detail.status === "APPROVED" ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="text-green-600 font-medium">
                                        PJUM sudah disetujui
                                    </span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-destructive" />
                                    <span className="text-destructive font-medium">
                                        PJUM ditolak
                                    </span>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}
