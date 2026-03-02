"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { checklistCategories } from "@/lib/checklist-data";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    XCircle,
    Wrench,
    Package,
    Building2,
    Layers,
    History,
    Printer,
    FileText,
    Calendar,
    User,
    ChevronDown,
    Image as ImageIcon,
    Loader2,
    PlayCircle,
} from "lucide-react";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { startWork } from "@/app/reports/actions";
import { submitCompletion } from "@/app/reports/actions/submit-completion";
import { reviewEstimation } from "@/app/reports/actions/approve-estimation";
import { reviewCompletion } from "@/app/reports/actions/review-completion";
import { approveFinal } from "@/app/reports/actions/approve-final";

type LogEntry = {
    status: string;
    notes: string | null;
    approverName: string;
    createdAt: Date;
};

type ReportDetailProps = {
    report: {
        reportNumber: string;
        storeName: string;
        storeCode: string;
        branchName: string;
        status: string;
        totalEstimation: number;
        createdAt: Date;
        updatedAt: Date;
        submittedBy: string;
        items: ReportItemJson[];
        estimations: MaterialEstimationJson[];
        logs: LogEntry[];
    };
    viewer: { role: string; nik: string };
};

const STATUS_STEPS = [
    { key: "PENDING_ESTIMATION",   label: "Menunggu Persetujuan Estimasi", icon: Clock },
    { key: "ESTIMATION_APPROVED",  label: "Estimasi Disetujui",            icon: CheckCircle2 },
    { key: "IN_PROGRESS",          label: "Sedang Dikerjakan",             icon: Wrench },
    { key: "PENDING_REVIEW",       label: "Menunggu Review Penyelesaian",               icon: Clock },
    { key: "APPROVED_BMC",         label: "Penyelesaian Disetujui",        icon: CheckCircle2 },
    { key: "COMPLETED",            label: "Selesai",                       icon: CheckCircle2 },
];

const STATUS_ORDER: Record<string, number> = {
    PENDING_ESTIMATION:          0,
    ESTIMATION_APPROVED:         1,
    ESTIMATION_REJECTED_REVISION:1,
    ESTIMATION_REJECTED:         1,
    IN_PROGRESS:                 2,
    PENDING_REVIEW:              3,
    REVIEW_REJECTED_REVISION:    3,
    APPROVED_BMC:                4,
    COMPLETED:                   5,
};

/** Returns true if this status represents a rejection at a given step */
function isRejectionStatus(status: string) {
    return status === "ESTIMATION_REJECTED" ||
        status === "ESTIMATION_REJECTED_REVISION" ||
        status === "REVIEW_REJECTED_REVISION";
}

/** Returns the step index where rejection occurred */
function getRejectionStep(status: string) {
    if (status === "ESTIMATION_REJECTED" || status === "ESTIMATION_REJECTED_REVISION") return 1;
    if (status === "REVIEW_REJECTED_REVISION") return 3;
    return -1;
}

function StatusTimeline({ status }: { status: string }) {
    const currentOrder = STATUS_ORDER[status] ?? 0;
    const isRejected = isRejectionStatus(status);
    const rejectionStep = getRejectionStep(status);

    const currentLabel = isRejected
        ? status === "ESTIMATION_REJECTED"
            ? "Estimasi Ditolak"
            : status === "ESTIMATION_REJECTED_REVISION"
              ? "Estimasi Ditolak (Revisi)"
              : "Pekerjaan Ditolak (Revisi)"
        : (STATUS_STEPS[currentOrder]?.label ?? status);

    return (
        <>
            {/* Mobile: compact progress strip */}
            <div className="lg:hidden">
                <div className="flex items-center gap-0.5 mb-2.5">
                    {STATUS_STEPS.map((step, idx) => {
                        const isPassed = currentOrder > idx && !isRejected;
                        const isActive = currentOrder === idx;
                        const isRejectedStep = isRejected && idx === rejectionStep;
                        return (
                            <div key={step.key} className="flex items-center flex-1 last:flex-none">
                                <div
                                    className={cn(
                                        "rounded-full shrink-0 transition-all",
                                        isActive
                                            ? "w-3 h-3 bg-primary ring-2 ring-primary/25"
                                            : isPassed
                                              ? "w-2 h-2 bg-primary"
                                              : isRejectedStep
                                                ? "w-3 h-3 bg-red-500 ring-2 ring-red-200"
                                                : "w-2 h-2 bg-muted-foreground/25",
                                    )}
                                />
                                {idx < STATUS_STEPS.length - 1 && (
                                    <div
                                        className={cn(
                                            "h-0.5 flex-1 mx-0.5",
                                            isPassed ? "bg-primary" : "bg-muted-foreground/20",
                                        )}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between">
                    <p
                        className={cn(
                            "text-sm font-semibold",
                            isRejected ? "text-red-600" : "text-foreground",
                        )}
                    >
                        {currentLabel}
                    </p>
                    <span className="text-xs text-muted-foreground">
                        Langkah {currentOrder + 1} / {STATUS_STEPS.length}
                    </span>
                </div>
            </div>

            {/* Desktop: full horizontal timeline */}
            <div className="hidden lg:flex items-center w-full max-w-3xl mx-auto py-2">
                {STATUS_STEPS.map((step, idx) => {
                    const isActive = step.key === status;
                    const isPassed = currentOrder > idx && !isRejected;
                    const isRejectedStep = isRejected && idx === rejectionStep;
                    const Icon = step.icon;

                    return (
                        <div
                            key={step.key}
                            className={cn(
                                "flex items-center",
                                idx < STATUS_STEPS.length - 1 ? "flex-1" : "",
                            )}
                        >
                            <div className="flex flex-col items-center relative z-10">
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                        isActive || isPassed
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : isRejectedStep
                                              ? "bg-red-100 border-red-500 text-red-600"
                                              : "bg-background border-muted text-muted-foreground",
                                    )}
                                >
                                    {isRejectedStep ? (
                                        <XCircle className="w-4 h-4" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "absolute top-10 text-[10px] sm:text-xs font-medium w-32 text-center transition-colors duration-300",
                                        isActive ? "text-foreground" : "text-muted-foreground",
                                    )}
                                >
                                    {isRejectedStep
                                        ? status === "ESTIMATION_REJECTED"
                                            ? "Estimasi Ditolak"
                                            : "Ditolak (Revisi)"
                                        : step.label}
                                </span>
                            </div>

                            {idx < STATUS_STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "h-0.5 flex-1 mx-2 -mt-6 transition-all duration-500",
                                        isPassed ? "bg-primary" : "bg-muted",
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_ESTIMATION":
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80">Menunggu Persetujuan Estimasi</Badge>;
        case "ESTIMATION_APPROVED":
            return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100/80">Estimasi Disetujui</Badge>;
        case "ESTIMATION_REJECTED_REVISION":
            return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100/80">Estimasi Ditolak (Revisi)</Badge>;
        case "ESTIMATION_REJECTED":
            return <Badge variant="destructive">Estimasi Ditolak</Badge>;
        case "IN_PROGRESS":
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100/80">Sedang Dikerjakan</Badge>;
        case "PENDING_REVIEW":
            return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100/80">Menunggu Review Penyelesaian</Badge>;
        case "REVIEW_REJECTED_REVISION":
            return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100/80">Ditolak (Revisi)</Badge>;
        case "APPROVED_BMC":
            return <Badge variant="secondary" className="bg-teal-100 text-teal-800 hover:bg-teal-100/80">Penyelesaian Disetujui</Badge>;
        case "COMPLETED":
            return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100/80">Selesai</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export function ReportDetailView({ report, viewer }: ReportDetailProps) {
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    const formatTime = (date: Date) =>
        new Date(date).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const rusakCount = report.items.filter(
        (i) => i.condition === "RUSAK" || i.preventiveCondition === "NOT_OK",
    ).length;

    const [isPending, startTransition] = useTransition();
    const [notesInput, setNotesInput] = useState("");
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const handleStartWork = () => {
        startTransition(async () => {
            const result = await startWork(report.reportNumber);
            if (result.error) {
                toast.error("Gagal memulai pengerjaan", { description: result.error });
            } else {
                toast.success("Pengerjaan dimulai!", { description: "Status laporan diubah menjadi 'Sedang Dikerjakan'." });
            }
        });
    };

    const handleSubmitCompletion = () => {
        startTransition(async () => {
            const result = await submitCompletion(report.reportNumber, notesInput || undefined);
            if (result.error) {
                toast.error("Gagal mengirim laporan penyelesaian", { description: result.error });
            } else {
                toast.success("Laporan dikirim!", { description: "Status laporan diubah menjadi 'Menunggu Review Penyelesaian'." });
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleReviewEstimation = (decision: "approve" | "reject_revision" | "reject") => {
        startTransition(async () => {
            const result = await reviewEstimation(report.reportNumber, decision, notesInput || undefined);
            if (result.error) {
                toast.error("Gagal memproses estimasi", { description: result.error });
            } else {
                const labels = { approve: "Estimasi disetujui", reject_revision: "Estimasi ditolak (revisi)", reject: "Estimasi ditolak" };
                toast.success(labels[decision]);
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleReviewCompletion = (decision: "approve" | "reject_revision") => {
        startTransition(async () => {
            const result = await reviewCompletion(report.reportNumber, decision, notesInput || undefined);
            if (result.error) {
                toast.error("Gagal memproses review", { description: result.error });
            } else {
                toast.success(decision === "approve" ? "Pekerjaan disetujui (BMC)" : "Pekerjaan ditolak (revisi)");
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    const handleApproveFinal = () => {
        startTransition(async () => {
            const result = await approveFinal(report.reportNumber, notesInput || undefined);
            if (result.error) {
                toast.error("Gagal melakukan persetujuan final", { description: result.error });
            } else {
                toast.success("Laporan selesai!", { description: "Status laporan diubah menjadi 'Selesai'." });
                setActiveDialog(null);
                setNotesInput("");
            }
        });
    };

    // Determine if there's an active CTA for mobile sticky bar
    const hasMobileCTA =
        (viewer.role === "BMS" && (report.status === "ESTIMATION_APPROVED" || report.status === "IN_PROGRESS" || report.status === "REVIEW_REJECTED_REVISION")) ||
        (viewer.role === "BMC" && (report.status === "PENDING_ESTIMATION" || report.status === "PENDING_REVIEW")) ||
        (viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC");

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title="Detail Laporan"
                description={`#${report.reportNumber}`}
                showBackButton
                backHref="/reports"
                logo={false}
            />

            <main className={cn("flex-1 container mx-auto px-4 py-4 md:py-8 max-w-7xl", hasMobileCTA && "pb-24 lg:pb-8")}>
                {/* Status Header — hidden for BMC/BNM_MANAGER */}
                {!["BMC", "BNM_MANAGER"].includes(viewer.role) && (
                    <div className="mb-10 lg:mb-16 md:-mt-5">
                        <StatusTimeline status={report.status} />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT SIDEBAR - Key Information */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:space-y-6 lg:sticky lg:top-10">

                        {/* ── MOBILE: compact summary card ── */}
                        <Card className="lg:hidden shadow-sm border-border/60">
                            <CardContent className="px-4 space-y-3">
                                {/* Store + status */}
                                <div className="min-w-0 space-y-1.5">
                                    <p className="font-semibold text-base leading-tight truncate">
                                        {report.storeCode ? `${report.storeCode} - ${report.storeName || "—"}` : report.storeName || "—"}
                                    </p>
                                    <div className="shrink-0">{getStatusBadge(report.status)}</div>
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <p className="text-xs text-muted-foreground truncate">{report.branchName}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Metadata 3-col grid */}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">No. Laporan</p>
                                        <p className="font-mono font-semibold text-[11px] leading-tight break-all">{report.reportNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">Tanggal</p>
                                        <p className="font-medium leading-tight">
                                            {new Date(report.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                        </p>
                                        <p className="text-muted-foreground">{formatTime(report.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">Dibuat Oleh</p>
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <p className="font-medium leading-tight truncate">{report.submittedBy}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Item stats */}
                                {report.items.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Item</p>
                                                    <p className="font-bold text-sm">{report.items.length}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Perlu Perbaikan</p>
                                                    <p className={cn("font-bold text-sm", rusakCount > 0 ? "text-red-600" : "text-green-600")}>{rusakCount}</p>
                                                </div>
                                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", rusakCount > 0 ? "bg-red-50" : "bg-green-50")}>
                                                    {rusakCount > 0
                                                        ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                                                        : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                                </div>
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
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Status Laporan</p>
                                    {getStatusBadge(report.status)}
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">No. Laporan</p>
                                    <p className="text-sm font-mono font-semibold">{report.reportNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Tanggal Dibuat</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{formatDate(report.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-5.5">{formatTime(report.createdAt)}</p>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Lokasi</p>
                                    <div className="flex gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium leading-tight">{report.storeCode ? `${report.storeCode} - ${report.storeName || "—"}` : report.storeName || "—"}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{report.branchName}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Dibuat Oleh</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>{report.submittedBy}</span>
                                    </div>
                                </div>
                                {report.items.length > 0 && (
                                    <div className="border-t border-border pt-6 -mx-6 -mb-6 px-6 flex justify-between items-center rounded-b-xl">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Total Item</p>
                                            <p className="text-lg font-bold">{report.items.length}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-muted-foreground">Perlu Perbaikan</p>
                                            <p className={cn("text-lg font-bold", rusakCount > 0 ? "text-red-600" : "text-green-600")}>
                                                {rusakCount}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <a
                            href={`/api/reports/${report.reportNumber}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block"
                        >
                            <Button
                                className="w-full"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Cetak PDF
                            </Button>
                        </a>

                        {/* Role-based CTA */}
                        {viewer.role === "BMS" && report.status === "ESTIMATION_APPROVED" && (
                            <div className="space-y-3">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex gap-2 items-start">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Estimasi Disetujui</p>
                                            <p className="text-xs text-green-700 mt-0.5">Silakan mulai pengerjaan maintenance.</p>
                                        </div>
                                    </div>
                                </div>
                                <Button className="w-full" size="lg" onClick={handleStartWork} disabled={isPending}>
                                    {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><PlayCircle className="h-4 w-4 mr-2" />Mulai Pengerjaan</>}
                                </Button>
                            </div>
                        )}

                        {viewer.role === "BMS" && (report.status === "IN_PROGRESS" || report.status === "REVIEW_REJECTED_REVISION") && (
                            <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-blue-800">
                                        {report.status === "REVIEW_REJECTED_REVISION" ? "Pekerjaan Ditolak — Perlu Revisi" : "Sedang Dikerjakan"}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        {report.status === "REVIEW_REJECTED_REVISION" ? "Perbaiki dan kirim ulang laporan penyelesaian." : "Setelah selesai, kirim laporan untuk direview BMC."}
                                    </p>
                                </div>
                                {activeDialog === "submit_completion" ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            rows={3}
                                            placeholder="Catatan penyelesaian (opsional)..."
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                        />
                                        <Button className="w-full" size="sm" onClick={handleSubmitCompletion} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</> : "Konfirmasi Kirim"}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    </div>
                                ) : (
                                    <Button className="w-full" size="lg" onClick={() => setActiveDialog("submit_completion")} disabled={isPending}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        {report.status === "REVIEW_REJECTED_REVISION" ? "Kirim Ulang Laporan" : "Kirim Laporan Penyelesaian"}
                                    </Button>
                                )}
                            </div>
                        )}

                        {viewer.role === "BMC" && report.status === "PENDING_ESTIMATION" && (
                            <div className="space-y-3">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-yellow-800">Menunggu Review Penyelesaian Estimasi</p>
                                    <p className="text-xs text-yellow-700 mt-0.5">Tinjau laporan dan putuskan persetujuan estimasi.</p>
                                </div>
                                {activeDialog === "reject_estimation" ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            rows={3}
                                            placeholder="Alasan penolakan (opsional)..."
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                        />
                                        <Button variant="destructive" size="sm" className="w-full" onClick={() => handleReviewEstimation("reject_revision")} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Tolak & Minta Revisi"}
                                        </Button>
                                        <Button variant="outline" size="sm" className="w-full text-red-600" onClick={() => handleReviewEstimation("reject")} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Tolak & Tutup Laporan"}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Button className="w-full" size="lg" onClick={() => handleReviewEstimation("approve")} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Setujui Estimasi</>}
                                        </Button>
                                        <Button variant="outline" size="lg" className="w-full" onClick={() => setActiveDialog("reject_estimation")} disabled={isPending}>
                                            <XCircle className="h-4 w-4 mr-2" />Tolak Estimasi
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewer.role === "BMC" && report.status === "PENDING_REVIEW" && (
                            <div className="space-y-3">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-purple-800">Menunggu Review Penyelesaian Penyelesaian</p>
                                    <p className="text-xs text-purple-700 mt-0.5">Tinjau hasil pengerjaan dan putuskan persetujuan.</p>
                                </div>
                                {activeDialog === "reject_completion" ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            rows={3}
                                            placeholder="Alasan penolakan (opsional)..."
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                        />
                                        <Button variant="destructive" size="sm" className="w-full" onClick={() => handleReviewCompletion("reject_revision")} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Tolak & Minta Revisi"}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Button className="w-full" size="lg" onClick={() => handleReviewCompletion("approve")} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Setujui Pekerjaan</>}
                                        </Button>
                                        <Button variant="outline" size="lg" className="w-full" onClick={() => setActiveDialog("reject_completion")} disabled={isPending}>
                                            <XCircle className="h-4 w-4 mr-2" />Tolak Pekerjaan
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC" && (
                            <div className="space-y-3">
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-teal-800">Disetujui BMC — Menunggu Persetujuan Final</p>
                                    <p className="text-xs text-teal-700 mt-0.5">Berikan persetujuan final untuk menyelesaikan laporan ini.</p>
                                </div>
                                {activeDialog === "approve_final" ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            rows={3}
                                            placeholder="Catatan (opsional)..."
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                        />
                                        <Button className="w-full" size="sm" onClick={handleApproveFinal} disabled={isPending}>
                                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Konfirmasi Selesai"}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    </div>
                                ) : (
                                    <Button className="w-full" size="lg" onClick={() => setActiveDialog("approve_final")} disabled={isPending}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />Setujui &amp; Selesaikan
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* MAIN CONTENT - Tabs */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <Tabs defaultValue="checklist" className="w-full">
                            <div className="mb-4 border-b border-border">
                                <TabsList className="bg-transparent h-auto p-0 w-full grid grid-cols-3 lg:flex lg:w-auto rounded-none">
                                    <TabsTrigger
                                        value="checklist"
                                        className="flex-1 lg:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Layers className="h-3.5 w-3.5 shrink-0" />
                                        <span className="font-medium text-sm">Checklist</span>
                                        <Badge
                                            variant="secondary"
                                            className="ml-0.5 h-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                        >
                                            {report.items.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="estimations"
                                        className="flex-1 lg:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Package className="h-3.5 w-3.5 shrink-0" />
                                        <span className="font-medium text-sm">Estimasi BMS Lengkap</span>
                                        <Badge
                                            variant="secondary"
                                            className="ml-0.5 h-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                        >
                                            {report.estimations.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="flex-1 lg:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <History className="h-3.5 w-3.5 shrink-0" />
                                        <span className="font-medium text-sm">Riwayat</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* TAB: CHECKLIST */}
                            <TabsContent
                                value="checklist"
                                className="space-y-3 mt-0"
                            >
                                {checklistCategories.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-10 text-center text-muted-foreground">
                                            Tidak ada data checklist.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="py-0 ring-0 md:py-6 shadow-none bg-transparent md:bg-background border-0 md:border">
                                        
                                        <CardContent className="space-y-3 px-1 md:px-6 pb-0 md:pb-6">
                                            {checklistCategories.map((category) => {
                                                const categoryReportItems = report.items.filter(
                                                    (i) => i.itemId.startsWith(category.id),
                                                );
                                                const totalItems = category.items.length;
                                                const filledItems = categoryReportItems.filter(
                                                    (i) => i.condition || i.preventiveCondition,
                                                ).length;
                                                const isCompleted = filledItems === totalItems && totalItems > 0;

                                                return (
                                                    <Collapsible
                                                        key={category.id}
                                                        defaultOpen={filledItems > 0}
                                                    >
                                                        <CollapsibleTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className="w-full justify-between"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                                                    ) : (
                                                                        <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                                                                    )}
                                                                    <span className="font-medium text-left">
                                                                        {category.title}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ({filledItems}/{totalItems})
                                                                    </span>
                                                                </div>
                                                                <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 in-data-[state=open]:rotate-180" />
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="pt-2">
                                                            <div className="space-y-4 md:p-4 md:border md:rounded-lg bg-transparent md:bg-muted/30">
                                                                {category.items.map((checklistItem) => {
                                                                    const reportItem = report.items.find(
                                                                        (i) => i.itemId === checklistItem.id,
                                                                    );
                                                                    const condition = reportItem?.condition;
                                                                    const preventive = reportItem?.preventiveCondition;
                                                                    const hasPhoto =
                                                                        (reportItem?.images && reportItem.images.length > 0) ||
                                                                        reportItem?.photoUrl;
                                                                    const isDamaged =
                                                                        condition === "RUSAK" || preventive === "NOT_OK";

                                                                    const getItemBadge = () => {
                                                                        if (preventive === "OK")
                                                                            return <Badge className="bg-green-600 hover:bg-green-700 shrink-0">OK</Badge>;
                                                                        if (preventive === "NOT_OK")
                                                                            return <Badge variant="destructive" className="shrink-0">NOT OK</Badge>;
                                                                        // Preventive items store in condition field: BAIK=OK, RUSAK=NOT OK
                                                                        if (category.isPreventive && condition === "BAIK")
                                                                            return <Badge className="bg-green-600 hover:bg-green-700 shrink-0">OK</Badge>;
                                                                        if (category.isPreventive && condition === "RUSAK")
                                                                            return <Badge variant="destructive" className="shrink-0">NOT OK</Badge>;
                                                                        if (condition === "BAIK")
                                                                            return <Badge className="bg-green-600 hover:bg-green-700 shrink-0">Baik</Badge>;
                                                                        if (condition === "RUSAK")
                                                                            return <Badge variant="destructive" className="shrink-0">Rusak</Badge>;
                                                                        if (condition === "TIDAK_ADA")
                                                                            return <Badge variant="secondary" className="text-muted-foreground shrink-0">Tidak Ada</Badge>;
                                                                        return <Badge variant="outline" className="text-muted-foreground shrink-0">-</Badge>;
                                                                    };

                                                                    return (
                                                                        <div
                                                                            key={checklistItem.id}
                                                                            className="space-y-3 p-3 bg-background rounded-md border"
                                                                        >
                                                                            {/* Item name + badge */}
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <p className="font-medium text-sm">
                                                                                    {checklistItem.id}. {checklistItem.name}
                                                                                </p>
                                                                                {getItemBadge()}
                                                                            </div>

                                                                            {/* Condition pill row (read-only replica) */}
                                                                            {(condition || preventive) && (
                                                                                <div className="flex flex-wrap gap-3 pt-3 border-t">
                                                                                    {category.isPreventive ? (
                                                                                        // Preventive items: condition field stores BAIK(=OK) / RUSAK(=NOT OK)
                                                                                        <>
                                                                                            <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", condition === "BAIK" ? "bg-green-50 border-green-200 text-green-700" : "bg-muted/40 text-muted-foreground")}>
                                                                                                <div className={cn("h-3 w-3 rounded-full border-2", condition === "BAIK" ? "border-green-600 bg-green-600" : "border-muted-foreground")} />
                                                                                                OK
                                                                                            </div>
                                                                                            <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", condition === "RUSAK" ? "bg-red-50 border-red-200 text-red-700" : "bg-muted/40 text-muted-foreground")}>
                                                                                                <div className={cn("h-3 w-3 rounded-full border-2", condition === "RUSAK" ? "border-red-600 bg-red-600" : "border-muted-foreground")} />
                                                                                                Not OK
                                                                                            </div>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", condition === "BAIK" ? "bg-green-50 border-green-200 text-green-700" : "bg-muted/40 text-muted-foreground")}>
                                                                                                <div className={cn("h-3 w-3 rounded-full border-2", condition === "BAIK" ? "border-green-600 bg-green-600" : "border-muted-foreground")} />
                                                                                                Baik
                                                                                            </div>
                                                                                            <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", condition === "RUSAK" ? "bg-red-50 border-red-200 text-red-700" : "bg-muted/40 text-muted-foreground")}>
                                                                                                <div className={cn("h-3 w-3 rounded-full border-2", condition === "RUSAK" ? "border-red-600 bg-red-600" : "border-muted-foreground")} />
                                                                                                Rusak
                                                                                            </div>
                                                                                            <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", condition === "TIDAK_ADA" ? "bg-muted border-border text-foreground" : "bg-muted/40 text-muted-foreground")}>
                                                                                                <div className={cn("h-3 w-3 rounded-full border-2", condition === "TIDAK_ADA" ? "border-foreground bg-foreground" : "border-muted-foreground")} />
                                                                                                Tidak Ada
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* Notes */}
                                                                            {reportItem?.notes && (
                                                                                <div className="pt-1 border-t">
                                                                                    <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                                                                                    <p className="text-sm">{reportItem.notes}</p>
                                                                                </div>
                                                                            )}

                                                                            {/* Handler */}
                                                                            {reportItem?.handler && (
                                                                                <div className="flex items-center gap-2 pt-3 border-t">
                                                                                    <p className="text-muted-foreground">Akan Dikerjakan oleh:</p>
                                                                                    <Badge variant="outline" className="text-sm">
                                                                                        {reportItem.handler === "REKANAN" ? "Rekanan" : reportItem.handler}
                                                                                    </Badge>
                                                                                </div>
                                                                            )}

                                                                            {/* Photo */}
                                                                            {(hasPhoto || isDamaged || condition === "BAIK" || preventive === "OK") && (
                                                                                <div className="pt-2 border-t">
                                                                                    <p className="text-muted-foreground mb-2">
                                                                                        {isDamaged ? "Foto Kerusakan" : "Foto Bukti"}
                                                                                    </p>
                                                                                    {hasPhoto ? (
                                                                                        <div
                                                                                            className="relative group overflow-hidden rounded-lg border-2 border-green-200 bg-green-50 w-full cursor-pointer"
                                                                                            onClick={() => setLightboxSrc(reportItem.images?.[0] || reportItem.photoUrl || "")}
                                                                                        >
                                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                            <img
                                                                                                src={reportItem.images?.[0] || reportItem.photoUrl || ""}
                                                                                                alt={`Foto ${checklistItem.name}`}
                                                                                                className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                                                                                            />
                                                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                                                                                <div className="bg-white/90 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                                                                                                    Klik untuk lihat
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : isDamaged ? (
                                                                                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20">
                                                                                            <ImageIcon className="h-3 w-3" />
                                                                                            <span>Foto wajib dilampirkan</span>
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            )}

                                                                            {/* Estimations for this item */}
                                                                            {(() => {
                                                                                const itemEstimations = report.estimations.filter(
                                                                                    (e) => e.itemId === checklistItem.id,
                                                                                );
                                                                                if (itemEstimations.length === 0) return null;
                                                                                return (
                                                                                    <div className="pt-2 border-t">
                                                                                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                                                                            <Package className="h-3 w-3" />
                                                                                            Estimasi Material
                                                                                        </p>
                                                                                        <div className="space-y-1">
                                                                                            {itemEstimations.map((est, idx) => (
                                                                                                <div key={idx} className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded px-2.5 py-1.5">
                                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                                        <span className="font-medium truncate">{est.materialName}</span>
                                                                                                        <span className="text-muted-foreground shrink-0">
                                                                                                            {est.quantity} {est.unit}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <span className="font-mono font-semibold shrink-0">
                                                                                                        {formatCurrency(est.totalPrice)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* TAB: ESTIMATIONS */}
                            <TabsContent value="estimations" className="mt-0">
                                <Card className="shadow-sm border-border/60">
                                    <CardHeader className="border-b">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                Rincian Estimasi Biaya BMS
                                            </CardTitle>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-sm bg-background"
                                            >
                                                Total:{" "}
                                                {formatCurrency(
                                                    report.totalEstimation,
                                                )}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {report.estimations.length === 0 ? (
                                            <div className="py-12 text-center">
                                                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                                <p className="text-muted-foreground">
                                                    Tidak ada estimasi material.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="hidden md:block">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent text-xs uppercase bg-muted/30">
                                                                <TableHead className="h-9">
                                                                    Nama
                                                                    Material
                                                                </TableHead>
                                                                <TableHead className="text-right h-9 w-24">
                                                                    Qty
                                                                </TableHead>
                                                                <TableHead className="text-right h-9 w-36">
                                                                    Harga Satuan
                                                                </TableHead>
                                                                <TableHead className="text-right h-9 w-40">
                                                                    Subtotal
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {report.estimations.map(
                                                                (est, i) => (
                                                                    <TableRow
                                                                        key={i}
                                                                        className="hover:bg-muted/10"
                                                                    >
                                                                        <TableCell className="text-sm font-medium py-3">
                                                                            {
                                                                                est.materialName
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm text-muted-foreground py-3">
                                                                            {
                                                                                est.quantity
                                                                            }{" "}
                                                                            {
                                                                                est.unit
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-mono text-muted-foreground py-3">
                                                                            {formatCurrency(
                                                                                est.price,
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-mono font-medium py-3">
                                                                            {formatCurrency(
                                                                                est.totalPrice,
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ),
                                                            )}
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-2 border-dashed">
                                                                <TableCell
                                                                    colSpan={3}
                                                                    className="text-right font-semibold text-sm"
                                                                >
                                                                    Total
                                                                    Estimasi
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold font-mono text-base text-primary">
                                                                    {formatCurrency(
                                                                        report.totalEstimation,
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                                {/* Mobile Estimation List */}
                                                <div className="md:hidden divide-y">
                                                    {report.estimations.map(
                                                        (est, i) => (
                                                            <div
                                                                key={i}
                                                                className="p-4 flex flex-col gap-2"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-sm font-medium">
                                                                        {
                                                                            est.materialName
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm font-bold font-mono text-primary">
                                                                        {formatCurrency(
                                                                            est.totalPrice,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                                    <span>
                                                                        {
                                                                            est.quantity
                                                                        }{" "}
                                                                        {
                                                                            est.unit
                                                                        }{" "}
                                                                        x{" "}
                                                                        {formatCurrency(
                                                                            est.price,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB: HISTORY */}
                            <TabsContent value="history" className="mt-0">
                                <Card className="shadow-sm border-border/60">
                                    <CardHeader className="border-b">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Riwayat Aktivitas
                                        </CardTitle>
                                        <CardDescription>
                                            Jejak persetujuan dan perubahan
                                            status laporan.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 pl-2">
                                        {report.logs.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-8">
                                                Belum ada riwayat aktivitas.
                                            </div>
                                        ) : (
                                            <div className="relative border-l border-muted ml-4 space-y-8 pb-2">
                                                {report.logs.map((log, i) => {
                                                    const statusLabels: Record<string, string> = {
                                                        DRAFT: "Draft Disimpan",
                                                        PENDING_ESTIMATION: "Laporan Dikirim",
                                                        ESTIMATION_APPROVED: "Estimasi Disetujui",
                                                        ESTIMATION_REJECTED_REVISION: "Estimasi Ditolak (Revisi)",
                                                        ESTIMATION_REJECTED: "Estimasi Ditolak",
                                                        IN_PROGRESS: "Mulai Pengerjaan",
                                                        PENDING_REVIEW: "Laporan Penyelesaian Dikirim",
                                                        REVIEW_REJECTED_REVISION: "Pekerjaan Ditolak (Revisi)",
                                                        APPROVED_BMC: "Penyelesaian Disetujui",
                                                        COMPLETED: "Laporan Selesai",
                                                    };
                                                    const isPositive = ["ESTIMATION_APPROVED", "IN_PROGRESS", "PENDING_REVIEW", "APPROVED_BMC", "COMPLETED", "PENDING_ESTIMATION"].includes(log.status);
                                                    const isNegative = ["ESTIMATION_REJECTED", "ESTIMATION_REJECTED_REVISION", "REVIEW_REJECTED_REVISION"].includes(log.status);
                                                    const label = statusLabels[log.status] ?? log.status;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="relative pl-6"
                                                        >
                                                            {/* Timeline Dot */}
                                                            <div
                                                                className={cn(
                                                                    "absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 bg-background transition-colors",
                                                                    isNegative
                                                                        ? "border-red-500 bg-red-50"
                                                                        : isPositive
                                                                          ? "border-green-500 bg-green-50"
                                                                          : "border-muted-foreground",
                                                                )}
                                                            />

                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                                                <div className="font-medium text-sm">{label}</div>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {formatDate(
                                                                        log.createdAt,
                                                                    )}{" "}
                                                                    •{" "}
                                                                    {formatTime(
                                                                        log.createdAt,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                                                                <User className="h-3 w-3" />
                                                                <span>
                                                                    {
                                                                        log.approverName
                                                                    }
                                                                </span>
                                                            </div>

                                                            {log.notes && (
                                                                <div className="bg-muted/30 p-3 rounded-md border border-border/50 text-xs italic text-muted-foreground relative">
                                                                    <span className="absolute top-2 left-2 text-muted-foreground/20 text-xl font-serif leading-none">
                                                                        “
                                                                    </span>
                                                                    <span className="pl-3 relative z-10">
                                                                        {
                                                                            log.notes
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* Mobile sticky bottom CTA bar */}
            {hasMobileCTA && (
                <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur border-t border-border px-4 py-3 safe-area-pb">
                    {viewer.role === "BMS" && report.status === "ESTIMATION_APPROVED" && (
                        <Button className="w-full" size="lg" onClick={handleStartWork} disabled={isPending}>
                            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><PlayCircle className="h-4 w-4 mr-2" />Mulai Pengerjaan</>}
                        </Button>
                    )}

                    {viewer.role === "BMS" && (report.status === "IN_PROGRESS" || report.status === "REVIEW_REJECTED_REVISION") && (
                        activeDialog === "submit_completion" ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                    rows={2}
                                    placeholder="Catatan penyelesaian (opsional)..."
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-none" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    <Button className="flex-1" size="sm" onClick={handleSubmitCompletion} disabled={isPending}>
                                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</> : "Konfirmasi Kirim"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button className="w-full" size="lg" onClick={() => setActiveDialog("submit_completion")} disabled={isPending}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {report.status === "REVIEW_REJECTED_REVISION" ? "Kirim Ulang Laporan" : "Kirim Laporan Penyelesaian"}
                            </Button>
                        )
                    )}

                    {viewer.role === "BMC" && report.status === "PENDING_ESTIMATION" && (
                        activeDialog === "reject_estimation" ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                    rows={2}
                                    placeholder="Alasan penolakan (opsional)..."
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-none" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleReviewEstimation("reject_revision")} disabled={isPending}>
                                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Tolak & Revisi"}
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-none text-red-600 border-red-200" onClick={() => handleReviewEstimation("reject")} disabled={isPending}>
                                        Tutup
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button className="flex-1" size="lg" onClick={() => handleReviewEstimation("approve")} disabled={isPending}>
                                    {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Setujui</>}
                                </Button>
                                <Button variant="outline" size="lg" onClick={() => setActiveDialog("reject_estimation")} disabled={isPending}>
                                    <XCircle className="h-4 w-4 mr-1" />Tolak
                                </Button>
                            </div>
                        )
                    )}

                    {viewer.role === "BMC" && report.status === "PENDING_REVIEW" && (
                        activeDialog === "reject_completion" ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                    rows={2}
                                    placeholder="Alasan penolakan (opsional)..."
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-none" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleReviewCompletion("reject_revision")} disabled={isPending}>
                                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Tolak & Revisi"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button className="flex-1" size="lg" onClick={() => handleReviewCompletion("approve")} disabled={isPending}>
                                    {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Setujui</>}
                                </Button>
                                <Button variant="outline" size="lg" onClick={() => setActiveDialog("reject_completion")} disabled={isPending}>
                                    <XCircle className="h-4 w-4 mr-1" />Tolak
                                </Button>
                            </div>
                        )
                    )}

                    {viewer.role === "BNM_MANAGER" && report.status === "APPROVED_BMC" && (
                        activeDialog === "approve_final" ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                                    rows={2}
                                    placeholder="Catatan (opsional)..."
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-none" onClick={() => { setActiveDialog(null); setNotesInput(""); }}>Batal</Button>
                                    <Button className="flex-1" size="sm" onClick={handleApproveFinal} disabled={isPending}>
                                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Konfirmasi Selesai"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button className="w-full" size="lg" onClick={() => setActiveDialog("approve_final")} disabled={isPending}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />Setujui &amp; Selesaikan
                            </Button>
                        )
                    )}
                </div>
            )}

            <Footer />

            {/* Photo Lightbox */}
            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxSrc(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={lightboxSrc}
                            alt="Foto Item"
                            className="w-full h-full object-contain rounded-lg max-h-[85vh]"
                        />
                        <button
                            onClick={() => setLightboxSrc(null)}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
