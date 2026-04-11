"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import {
    Loader2,
    CheckCircle2,
    XCircle,
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
    approvePjumExport,
    type PjumExportDetail as PjumExportDetailType,
} from "../approval-actions";

function fmtCurrency(amount: number): string {
    return Number(amount).toLocaleString("id-ID");
}

type Props = {
    detail: PjumExportDetailType;
};

export function PjumApprovalDetail({ detail }: Props) {
    const router = useRouter();
    const [isApproving, startApproveTransition] = useTransition();

    const fromDate = new Date(detail.fromDate);

    function handleApprove() {
        startApproveTransition(async () => {
            const result = await approvePjumExport({
                pjumExportId: detail.id,
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
    const isPending = detail.status === "PENDING_APPROVAL";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Detail PJUM"
                description="Tinjau laporan sebelum menyetujui PJUM"
                showBackButton
                backHref="/reports/pjum"
                logo={false}
            />

            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl pb-24 lg:pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* ── LEFT COLUMN (3/5) ─────────────────────────────── */}
                    <div
                        className={`${isPending ? "lg:col-span-5" : "lg:col-span-3"} space-y-6`}
                    >
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
                                        href={detail.pjumFinalDriveUrl || `/api/reports/pjum-pdf?ids=${detail.reportNumbers.join(",")}&bmsNIK=${detail.bmsNIK}&from=${detail.fromDate}&to=${detail.toDate}&week=${detail.weekNumber}`}
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
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Selesai:{" "}
                                                    {r.finishedAt
                                                        ? format(
                                                              new Date(
                                                                  r.finishedAt,
                                                              ),
                                                              "dd MMM yyyy",
                                                              {
                                                                  locale: localeId,
                                                              },
                                                          )
                                                        : "—"}
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
                                                <TableHead>Selesai</TableHead>
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
                                                    <TableCell className="text-muted-foreground">
                                                        {r.finishedAt
                                                            ? format(
                                                                  new Date(
                                                                      r.finishedAt,
                                                                  ),
                                                                  "dd MMM yyyy",
                                                                  {
                                                                      locale: localeId,
                                                                  },
                                                              )
                                                            : "—"}
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
                                                    colSpan={4}
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
                    {!isPending && (
                        <div className="lg:col-span-2 space-y-6">
                            {/* Already processed status */}
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
                        </div>
                    )}
                </div>
            </main>

            {/* ── Sticky Bottom Action Bar (only when pending) ────────── */}
            {isPending && (
                <div className="fixed bottom-0 inset-x-0 z-50 bg-background border-t shadow-[0_-12px_12px_-12px_rgba(0,0,0,0.1)]">
                    <div className="container mx-auto px-4 py-5 max-w-7xl flex items-center justify-end gap-4 h-24">
                        <Button
                            size="lg"
                            className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                            onClick={handleApprove}
                            disabled={isApproving}
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

            <Footer />
        </div>
    );
}
