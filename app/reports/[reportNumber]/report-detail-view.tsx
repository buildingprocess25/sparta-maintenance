"use client";

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
} from "lucide-react";
import type { ReportItemJson, MaterialEstimationJson } from "@/types/report";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { cn } from "@/lib/utils";

type LogEntry = {
    status: string;
    notes: string | null;
    approverName: string;
    createdAt: Date;
};

type ReportDetailProps = {
    report: {
        id: string;
        reportNumber: string;
        storeName: string;
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
};

const STATUS_STEPS = [
    { key: "PENDING_APPROVAL", label: "Menunggu Persetujuan", icon: Clock },
    { key: "APPROVED", label: "Disetujui", icon: CheckCircle2 },
    { key: "COMPLETED", label: "Selesai", icon: Wrench },
];

const STATUS_ORDER: Record<string, number> = {
    PENDING_APPROVAL: 0,
    APPROVED: 1,
    REJECTED: 1,
    COMPLETED: 2,
};

function StatusTimeline({ status }: { status: string }) {
    const currentOrder = STATUS_ORDER[status] ?? 0;
    const isRejected = status === "REJECTED";

    return (
        <div className="flex items-center w-full max-w-3xl mx-auto py-2">
            {STATUS_STEPS.map((step, idx) => {
                const isActive = step.key === status;
                const isPassed = currentOrder > idx && !isRejected;
                const isRejectedStep = isRejected && idx === 1; // Rejection happens at approval stage (index 1)
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
                                    isActive
                                        ? "text-foreground"
                                        : "text-muted-foreground",
                                )}
                            >
                                {isRejectedStep ? "Ditolak" : step.label}
                            </span>
                        </div>

                        {idx < STATUS_STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 flex-1 mx-2 -mt-6 transition-all duration-500", // Lifted up to align with circles
                                    isPassed ? "bg-primary" : "bg-muted",
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_APPROVAL":
            return (
                <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80"
                >
                    Menunggu Persetujuan
                </Badge>
            );
        case "APPROVED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 hover:bg-green-100/80"
                >
                    Disetujui
                </Badge>
            );
        case "REJECTED":
            return <Badge variant="destructive">Ditolak</Badge>;
        case "COMPLETED":
            return (
                <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-100/80"
                >
                    Selesai
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

export function ReportDetailView({ report }: ReportDetailProps) {
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

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header
                variant="dashboard"
                title="Detail Laporan"
                description={`Tracking progress untuk laporan #${report.reportNumber}`}
                showBackButton
                backHref="/reports"
            />

            <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
                {/* Status Header */}
                <div className="mb-10 mt-2 px-2">
                    <StatusTimeline status={report.status} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT SIDEBAR - Key Information */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-6">
                        <Card className="shadow-sm border-border/60 ">
                            <CardHeader className="border-b">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Informasi Utama
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Status Laporan
                                    </p>
                                    {getStatusBadge(report.status)}
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
                                        <span>
                                            {formatDate(report.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-5.5">
                                        {formatTime(report.createdAt)}
                                    </p>
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                            Lokasi
                                        </p>
                                        <div className="flex gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium leading-tight">
                                                    {report.storeName || "—"}
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
                                </div>
                                {report.items.length > 0 && (
                                    <>
                                        <div className="bg-muted/30 -mx-6 -mb-6 px-6 py-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    Total Item
                                                </p>
                                                <p className="text-lg font-bold">
                                                    {report.items.length}
                                                </p>
                                            </div>
                                            <div className="text-right">
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
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions (Future placeholder) */}
                        <a
                            href={`/api/reports/${report.reportNumber}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full"
                        >
                            <Button
                                className="w-full"
                                variant="default"
                                size="lg"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Cetak PDF
                            </Button>
                        </a>
                    </div>

                    {/* MAIN CONTENT - Tabs */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <Tabs defaultValue="checklist" className="w-full">
                            <div className="flex items-center justify-between mb-4">
                                <TabsList className="bg-muted h-10 p-1">
                                    <TabsTrigger value="checklist">
                                        <Layers className="h-3.5 w-3.5" />
                                        Checklist
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 h-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                        >
                                            {report.items.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="estimations">
                                        <Package className="h-3.5 w-3.5" />
                                        Estimasi
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 h-5 px-1.5 text-[10px] hidden sm:inline-flex"
                                        >
                                            {report.estimations.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="history">
                                        <History className="h-3.5 w-3.5" />
                                        Riwayat
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* TAB: CHECKLIST */}
                            <TabsContent
                                value="checklist"
                                className="space-y-4 mt-0"
                            >
                                {checklistCategories.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-10 text-center text-muted-foreground">
                                            Tidak ada data checklist.
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base">
                                                    Checklist Kondisi
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Total{" "}
                                                    {checklistCategories.reduce(
                                                        (acc, cat) =>
                                                            acc +
                                                            cat.items.length,
                                                        0,
                                                    )}{" "}
                                                    item
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {checklistCategories.map(
                                                    (category) => {
                                                        // Calculate stats for this category based on report items
                                                        const categoryReportItems =
                                                            report.items.filter(
                                                                (i) =>
                                                                    i.itemId.startsWith(
                                                                        category.id,
                                                                    ),
                                                            );
                                                        const totalItems =
                                                            category.items
                                                                .length;
                                                        const filledItems =
                                                            categoryReportItems.filter(
                                                                (i) =>
                                                                    i.condition ||
                                                                    i.preventiveCondition,
                                                            ).length;

                                                        return (
                                                            <Collapsible
                                                                key={
                                                                    category.id
                                                                }
                                                                defaultOpen={
                                                                    filledItems >
                                                                    0
                                                                }
                                                                className="border rounded-lg shadow-sm bg-card"
                                                            >
                                                                <CollapsibleTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                                                                                {
                                                                                    category.id
                                                                                }
                                                                            </div>
                                                                            <div className="flex flex-col items-start gap-1">
                                                                                <span className="font-semibold text-left">
                                                                                    {category.title.split(
                                                                                        ". ",
                                                                                    )[1] ||
                                                                                        category.title}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    (
                                                                                    {
                                                                                        filledItems
                                                                                    }

                                                                                    /
                                                                                    {
                                                                                        totalItems
                                                                                    }{" "}
                                                                                    Item)
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200" />
                                                                    </Button>
                                                                </CollapsibleTrigger>
                                                                <CollapsibleContent>
                                                                    <div className="p-4 pt-0 space-y-4">
                                                                        <Separator className="mb-4" />
                                                                        {category.items.map(
                                                                            (
                                                                                checklistItem,
                                                                            ) => {
                                                                                const reportItem =
                                                                                    report.items.find(
                                                                                        (
                                                                                            i,
                                                                                        ) =>
                                                                                            i.itemId ===
                                                                                            checklistItem.id,
                                                                                    );

                                                                                // Helper to get status color and label
                                                                                const getStatusBadge =
                                                                                    () => {
                                                                                        const condition =
                                                                                            reportItem?.condition;
                                                                                        const preventive =
                                                                                            reportItem?.preventiveCondition;

                                                                                        if (
                                                                                            preventive ===
                                                                                            "OK"
                                                                                        )
                                                                                            return (
                                                                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                                                                    OK
                                                                                                </Badge>
                                                                                            );
                                                                                        if (
                                                                                            preventive ===
                                                                                            "NOT_OK"
                                                                                        )
                                                                                            return (
                                                                                                <Badge variant="destructive">
                                                                                                    NOT
                                                                                                    OK
                                                                                                </Badge>
                                                                                            );

                                                                                        if (
                                                                                            condition ===
                                                                                            "BAIK"
                                                                                        )
                                                                                            return (
                                                                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                                                                    Baik
                                                                                                </Badge>
                                                                                            );
                                                                                        if (
                                                                                            condition ===
                                                                                            "RUSAK"
                                                                                        )
                                                                                            return (
                                                                                                <Badge variant="destructive">
                                                                                                    Rusak
                                                                                                </Badge>
                                                                                            );
                                                                                        if (
                                                                                            condition ===
                                                                                            "TIDAK_ADA"
                                                                                        )
                                                                                            return (
                                                                                                <Badge
                                                                                                    variant="secondary"
                                                                                                    className="text-muted-foreground"
                                                                                                >
                                                                                                    Tidak
                                                                                                    Ada
                                                                                                </Badge>
                                                                                            );

                                                                                        return (
                                                                                            <Badge
                                                                                                variant="outline"
                                                                                                className="text-muted-foreground"
                                                                                            >
                                                                                                -
                                                                                            </Badge>
                                                                                        );
                                                                                    };

                                                                                const hasPhoto =
                                                                                    (reportItem?.images &&
                                                                                        reportItem
                                                                                            .images
                                                                                            .length >
                                                                                            0) ||
                                                                                    reportItem?.photoUrl;
                                                                                const isDamaged =
                                                                                    reportItem?.condition ===
                                                                                        "RUSAK" ||
                                                                                    reportItem?.preventiveCondition ===
                                                                                        "NOT_OK";

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            checklistItem.id
                                                                                        }
                                                                                        className="p-3 bg-muted/20 rounded-lg border border-border/50"
                                                                                    >
                                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                                            <div className="flex items-start gap-3">
                                                                                                <span className="font-mono text-sm font-medium text-muted-foreground min-w-[2rem] pt-0.5">
                                                                                                    {
                                                                                                        checklistItem.id
                                                                                                    }
                                                                                                </span>
                                                                                                <span className="text-sm font-medium pt-0.5">
                                                                                                    {
                                                                                                        checklistItem.name
                                                                                                    }
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 pl-11 sm:pl-0">
                                                                                                {getStatusBadge()}
                                                                                                {reportItem?.handler && (
                                                                                                    <Badge variant="outline">
                                                                                                        Handler:{" "}
                                                                                                        {reportItem.handler ===
                                                                                                        "REKANAN"
                                                                                                            ? "Rekanan"
                                                                                                            : reportItem.handler}
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Photo Section - Only show if photo exists OR if it is damaged/OK (to show missing photo placeholder) */}
                                                                                        {(hasPhoto ||
                                                                                            isDamaged ||
                                                                                            reportItem?.condition ===
                                                                                                "BAIK" ||
                                                                                            reportItem?.preventiveCondition ===
                                                                                                "OK") && (
                                                                                            <div className="mt-3 pl-11">
                                                                                                {hasPhoto ? (
                                                                                                    <div className="relative group overflow-hidden rounded-md border bg-muted w-32 h-32">
                                                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                                        <img
                                                                                                            src={
                                                                                                                reportItem
                                                                                                                    .images?.[0] ||
                                                                                                                reportItem.photoUrl ||
                                                                                                                ""
                                                                                                            }
                                                                                                            alt={`Foto ${checklistItem.name}`}
                                                                                                            className="w-full h-full object-cover transition-transform hover:scale-105 cursor-pointer"
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : isDamaged ? (
                                                                                                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20">
                                                                                                        <ImageIcon className="h-3 w-3" />
                                                                                                        <span>
                                                                                                            Foto
                                                                                                            wajib
                                                                                                            dilampirkan
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                </CollapsibleContent>
                                                            </Collapsible>
                                                        );
                                                    },
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB: ESTIMATIONS */}
                            <TabsContent value="estimations" className="mt-0">
                                <Card className="shadow-sm border-border/60">
                                    <CardHeader className="bg-muted/10">
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
                                    <CardHeader className="pb-4 border-b bg-muted/10">
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
                                                    const isApproved =
                                                        log.status ===
                                                        "APPROVED";
                                                    const isRejected =
                                                        log.status ===
                                                        "REJECTED";

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="relative pl-6"
                                                        >
                                                            {/* Timeline Dot */}
                                                            <div
                                                                className={cn(
                                                                    "absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 bg-background transition-colors",
                                                                    isApproved
                                                                        ? "border-green-500 bg-green-50"
                                                                        : isRejected
                                                                          ? "border-red-500 bg-red-50"
                                                                          : "border-muted-foreground",
                                                                )}
                                                            />

                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                                                <div className="font-medium text-sm">
                                                                    {isApproved
                                                                        ? "Disetujui"
                                                                        : isRejected
                                                                          ? "Ditolak"
                                                                          : log.status}
                                                                </div>
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

            <Footer />
        </div>
    );
}
