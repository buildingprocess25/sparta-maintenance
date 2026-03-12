import {
    Building2,
    Calendar,
    CheckCircle2,
    FileText,
    Loader2,
    WrenchIcon,
    Printer,
    User,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { ReportData, Viewer, ActionState } from "./types";

type Props = {
    report: ReportData;
    viewer: Viewer;
    rusakCount: number;
    formatDate: (d: Date) => string;
    formatTime: (d: Date) => string;
    actions: ActionState;
};

export function ReportSidebar({
    report,
    viewer,
    rusakCount,
    formatDate,
    formatTime,
    actions,
}: Props) {
    const {
        isPending,
        notesInput,
        setNotesInput,
        activeDialog,
        setActiveDialog,
        handleReviewEstimation,
        handleReviewCompletion,
    } = actions;

    const hasAction =
        (viewer.role === "BMS" &&
            (report.status === "ESTIMATION_APPROVED" ||
                report.status === "IN_PROGRESS" ||
                report.status === "REVIEW_REJECTED_REVISION")) ||
        (viewer.role === "BMC" &&
            (report.status === "PENDING_ESTIMATION" ||
                report.status === "PENDING_REVIEW")) ||
        false;

    return (
        <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:space-y-6 lg:sticky lg:top-10">
            {/* ── DESKTOP CTA: always visible at top of sticky sidebar ── */}
            <div className="hidden lg:block space-y-3">
                {/* PDF print button */}
                <a
                    href={`/api/reports/${report.reportNumber}/pdf?v=${report.updatedAt.getTime()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block"
                >
                    <Button
                        variant={hasAction ? "outline" : "default"}
                        className="w-full"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Lihat Laporan Lengkap (PDF)
                    </Button>
                </a>

                {/* ── BMS: start work ── */}
                {viewer.role === "BMS" &&
                    report.status === "ESTIMATION_APPROVED" && (
                        <div className="space-y-3">
                            <Link
                                href={`/reports/start-work?report=${report.reportNumber}`}
                                className="block w-full"
                            >
                                <Button className="w-full">
                                    <WrenchIcon className="h-4 w-4 mr-2" />
                                    Mulai Pengerjaan
                                </Button>
                            </Link>
                        </div>
                    )}

                {/* ── BMS: submit completion ── */}
                {viewer.role === "BMS" &&
                    (report.status === "IN_PROGRESS" ||
                        report.status === "REVIEW_REJECTED_REVISION") && (
                        <div className="space-y-3">
                            <Link
                                href={`/reports/complete?report=${report.reportNumber}`}
                                className="block w-full"
                            >
                                <Button className="w-full" size="lg">
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {report.status ===
                                    "REVIEW_REJECTED_REVISION"
                                        ? "Kirim Ulang Laporan"
                                        : "Kirim Laporan Penyelesaian"}
                                </Button>
                            </Link>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-blue-800">
                                    {report.status ===
                                    "REVIEW_REJECTED_REVISION"
                                        ? "Pekerjaan Ditolak — Perlu Revisi"
                                        : "Sedang Dikerjakan"}
                                </p>
                                <p className="text-xs text-blue-700 mt-0.5">
                                    {report.status ===
                                    "REVIEW_REJECTED_REVISION"
                                        ? "Perbaiki dan kirim ulang laporan penyelesaian."
                                        : "Setelah selesai, kirim laporan untuk direview BMC."}
                                </p>
                            </div>
                        </div>
                    )}

                {/* ── BMC: review estimation ── */}
                {viewer.role === "BMC" &&
                    report.status === "PENDING_ESTIMATION" && (
                        <div className="space-y-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-yellow-800">
                                    Menunggu Review Estimasi
                                </p>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                    Tinjau laporan dan putuskan persetujuan
                                    estimasi.
                                </p>
                            </div>
                            {activeDialog === "reject_estimation" ? (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        rows={3}
                                        placeholder="Alasan penolakan (opsional)..."
                                        value={notesInput}
                                        onChange={(e) =>
                                            setNotesInput(e.target.value)
                                        }
                                    />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        onClick={() =>
                                            handleReviewEstimation(
                                                "reject_revision",
                                            )
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            "Tolak & Minta Revisi"
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-red-600"
                                        onClick={() =>
                                            handleReviewEstimation("reject")
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            "Tolak & Tutup Laporan"
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            setActiveDialog(null);
                                            setNotesInput("");
                                        }}
                                    >
                                        Batal
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() =>
                                            handleReviewEstimation("approve")
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Setujui Estimasi
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                        onClick={() =>
                                            setActiveDialog("reject_estimation")
                                        }
                                        disabled={isPending}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Tolak Estimasi
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                {/* ── BMC: review completion ── */}
                {viewer.role === "BMC" &&
                    report.status === "PENDING_REVIEW" && (
                        <div className="space-y-3">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-purple-800">
                                    Menunggu Review Penyelesaian
                                </p>
                                <p className="text-xs text-purple-700 mt-0.5">
                                    Tinjau hasil pengerjaan dan putuskan
                                    persetujuan.
                                </p>
                            </div>
                            {activeDialog === "reject_completion" ? (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        rows={3}
                                        placeholder="Alasan penolakan (opsional)..."
                                        value={notesInput}
                                        onChange={(e) =>
                                            setNotesInput(e.target.value)
                                        }
                                    />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        onClick={() =>
                                            handleReviewCompletion(
                                                "reject_revision",
                                            )
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            "Tolak & Minta Revisi"
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            setActiveDialog(null);
                                            setNotesInput("");
                                        }}
                                    >
                                        Batal
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={() =>
                                            handleReviewCompletion("approve")
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Setujui Pekerjaan
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                        onClick={() =>
                                            setActiveDialog("reject_completion")
                                        }
                                        disabled={isPending}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Tolak Pekerjaan
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
            </div>

            {/* ── MOBILE: compact summary card ── */}
            <Card className="lg:hidden shadow-sm border-border/60">
                <CardContent className="px-4 space-y-3">
                    <div className="min-w-0 space-y-1.5">
                        <p className="font-semibold text-base leading-tight truncate">
                            {report.storeCode
                                ? `${report.storeCode} - ${report.storeName || "—"}`
                                : report.storeName || "—"}
                        </p>
                        <div className="shrink-0">
                            <StatusBadge status={report.status} />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">
                                {report.branchName}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <p className="text-muted-foreground mb-0.5">
                                No. Laporan
                            </p>
                            <p className="font-mono font-semibold text-[11px] leading-tight break-all">
                                {report.reportNumber}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-0.5">
                                Tanggal
                            </p>
                            <p className="font-medium leading-tight">
                                {new Date(report.createdAt).toLocaleDateString(
                                    "id-ID",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    },
                                )}
                            </p>
                            <p className="text-muted-foreground">
                                {formatTime(report.createdAt)}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-0.5">
                                Dibuat Oleh
                            </p>
                            <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="font-medium leading-tight">
                                    {report.submittedBy}
                                </p>
                            </div>
                        </div>
                    </div>

                    {report.items.length > 0 && (
                        <>
                            <Separator />
                            <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center",
                                        rusakCount > 0
                                            ? "bg-red-50"
                                            : "bg-green-50",
                                    )}
                                >
                                    {rusakCount > 0 ? (
                                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                                    ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Perlu Perbaikan
                                    </p>
                                    <p
                                        className={cn(
                                            "font-bold text-sm",
                                            rusakCount > 0
                                                ? "text-red-600"
                                                : "text-green-600",
                                        )}
                                    >
                                        {rusakCount}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── DESKTOP: vertical sidebar card ── */}
            <Card className="hidden lg:block shadow-sm border-border/60">
                <CardHeader className="border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Informasi Utama
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            Status Laporan
                        </p>
                        <StatusBadge status={report.status} />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                            No. Laporan
                        </p>
                        <p className="text-sm font-mono font-semibold">
                            {report.reportNumber}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                            Tanggal Dibuat
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(report.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5.5">
                            {formatTime(report.createdAt)}
                        </p>
                    </div>
                    <Separator />
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                            Lokasi
                        </p>
                        <div className="flex gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium leading-tight">
                                    {report.storeCode
                                        ? `${report.storeCode} - ${report.storeName || "—"}`
                                        : report.storeName || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {report.branchName}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                            Dibuat Oleh
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{report.submittedBy}</span>
                        </div>
                    </div>
                    {report.items.length > 0 && (
                        <div className="border-t border-border pt-6 -mx-6 -mb-6 px-6 flex items-center gap-3 rounded-b-xl">
                            <div
                                className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                    rusakCount > 0
                                        ? "bg-red-50"
                                        : "bg-green-50",
                                )}
                            >
                                {rusakCount > 0 ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Perlu Perbaikan
                                </p>
                                <p
                                    className={cn(
                                        "text-lg font-bold",
                                        rusakCount > 0
                                            ? "text-red-600"
                                            : "text-green-600",
                                    )}
                                >
                                    {rusakCount}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
