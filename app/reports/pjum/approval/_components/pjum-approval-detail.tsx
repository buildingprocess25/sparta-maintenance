"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    CreditCard,
    FileText,
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
    getPjumExportDetail,
    getBmsBankAccounts,
    approvePjumExport,
    type PjumExportDetail as PjumExportDetailType,
    type BankAccountOption,
} from "../actions";

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

export function PjumApprovalDetail({
    pjumExportId,
}: {
    pjumExportId: string;
}) {
    const router = useRouter();
    const [detail, setDetail] = useState<PjumExportDetailType | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isApproving, startApproveTransition] = useTransition();

    // PUM form state
    const [bankAccountNo, setBankAccountNo] = useState("");
    const [bankAccountName, setBankAccountName] = useState("");
    const [bankName, setBankName] = useState("");
    const [pumWeekNumber, setPumWeekNumber] = useState<number>(1);
    const [pumMonth, setPumMonth] = useState("");
    const [pumYear, setPumYear] = useState<number>(new Date().getFullYear());

    const loadData = useCallback(() => {
        startLoadTransition(async () => {
            const result = await getPjumExportDetail(pjumExportId);
            if (result.error) {
                setError(result.error);
                return;
            }
            if (result.data) {
                setDetail(result.data);

                // Auto-fill PUM week/month/year from PJUM data
                setPumWeekNumber(result.data.weekNumber);
                const fromDate = new Date(result.data.fromDate);
                setPumMonth(fromDate.toLocaleString("id-ID", { month: "long" }));
                setPumYear(fromDate.getFullYear());

                // Load saved bank accounts
                const bankResult = await getBmsBankAccounts(result.data.bmsNIK);
                if (bankResult.data.length > 0) {
                    setBankAccounts(bankResult.data);
                    // Pre-fill with most recent
                    const latest = bankResult.data[0];
                    setBankAccountNo(latest.bankAccountNo);
                    setBankAccountName(latest.bankAccountName);
                    setBankName(latest.bankName);
                }
            }
        });
    }, [pjumExportId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
                pjumExportId,
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
                router.push("/reports/pjum/approval");
            }
        });
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-background/50">
                <Header
                    variant="dashboard"
                    title="Detail PJUM"
                    description="Memuat data..."
                    showBackButton
                    backHref="/reports/pjum/approval"
                    logo={false}
                />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen flex flex-col bg-background/50">
                <Header
                    variant="dashboard"
                    title="Detail PJUM"
                    description="Terjadi kesalahan"
                    showBackButton
                    backHref="/reports/pjum/approval"
                    logo={false}
                />
                <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-8">
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-2 py-4">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive">
                                {error ?? "PJUM tidak ditemukan"}
                            </span>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    const selisih = 1_000_000 - detail.totalExpenditure;

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title="Detail PJUM"
                description="Tinjau laporan dan isi informasi PUM untuk menyetujui"
                showBackButton
                backHref="/reports/pjum/approval"
                logo={false}
            />
            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-4xl pb-24 lg:pb-8 space-y-6">

                {/* PJUM Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Informasi PJUM
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">
                                    BMS:
                                </span>
                                <p className="font-medium">
                                    {detail.bmsName}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    NIK BMS:
                                </span>
                                <p className="font-medium">
                                    {detail.bmsNIK}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Cabang:
                                </span>
                                <p className="font-medium">
                                    {detail.branchName}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Minggu ke:
                                </span>
                                <p className="font-medium">
                                    <Badge variant="outline">
                                        {detail.weekNumber}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Periode:
                                </span>
                                <p className="font-medium">
                                    {format(
                                        new Date(detail.fromDate),
                                        "d MMM",
                                        { locale: localeId },
                                    )}{" "}
                                    –{" "}
                                    {format(
                                        new Date(detail.toDate),
                                        "d MMM yyyy",
                                        { locale: localeId },
                                    )}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Dibuat oleh:
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

                {/* Reports table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Laporan ({detail.reports.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No</TableHead>
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
                                            {fmtCurrency(r.totalEstimation)}
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
                    </CardContent>
                </Card>

                {/* PUM Form — only show if pending */}
                {detail.status === "PENDING_APPROVAL" && (
                    <Card className="border-primary/30">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Form PUM — Informasi Transfer
                            </CardTitle>
                            <CardDescription>
                                Isi informasi transfer ke BMS dan keperluan PUM
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
                                            setBankAccountName(e.target.value)
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
                                                {[1, 2, 3, 4, 5].map((w) => (
                                                    <SelectItem
                                                        key={w}
                                                        value={String(w)}
                                                    >
                                                        Minggu {w}
                                                    </SelectItem>
                                                ))}
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

                {/* Already processed status */}
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
