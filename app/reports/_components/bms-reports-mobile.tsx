"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    Calendar,
    Clock,
    Eye,
    Pencil,
    Wrench,
    Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReportData } from "./bms-reports-list";

const MOBILE_ACTION_CONFIG: Record<
    string,
    { label: string; icon: React.ReactNode; cta: boolean }
> = {
    DRAFT: {
        label: "Lanjutkan",
        icon: <Pencil className="h-3 w-3" />,
        cta: true,
    },
    PENDING_ESTIMATION: {
        label: "Lihat",
        icon: <Eye className="h-3 w-3" />,
        cta: false,
    },
    ESTIMATION_APPROVED: {
        label: "Mulai Pekerjaan",
        icon: <Wrench className="h-3 w-3" />,
        cta: true,
    },
    ESTIMATION_REJECTED_REVISION: {
        label: "Revisi",
        icon: <Pencil className="h-3 w-3" />,
        cta: true,
    },
    ESTIMATION_REJECTED: {
        label: "Lihat",
        icon: <Eye className="h-3 w-3" />,
        cta: false,
    },
    IN_PROGRESS: {
        label: "Selesaikan",
        icon: <Check className="h-3 w-3" />,
        cta: true,
    },
    PENDING_REVIEW: {
        label: "Lihat",
        icon: <Eye className="h-3 w-3" />,
        cta: false,
    },
    REVIEW_REJECTED_REVISION: {
        label: "Revisi",
        icon: <Pencil className="h-3 w-3" />,
        cta: true,
    },
    APPROVED_BMC: {
        label: "Lihat",
        icon: <Eye className="h-3 w-3" />,
        cta: false,
    },
    COMPLETED: {
        label: "Lihat",
        icon: <Eye className="h-3 w-3" />,
        cta: false,
    },
};

interface BmsReportsMobileProps {
    reports: ReportData[];
}

export function BmsReportsMobile({ reports }: BmsReportsMobileProps) {
    const router = useRouter();

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${Number(amount).toLocaleString("id-ID")}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DRAFT":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-gray-100 text-gray-700 border-gray-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Draft
                    </Badge>
                );
            case "PENDING_ESTIMATION":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Menunggu Est.
                    </Badge>
                );
            case "ESTIMATION_APPROVED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-green-100 text-green-700 border-green-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Est. Disetujui
                    </Badge>
                );
            case "ESTIMATION_REJECTED_REVISION":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-orange-100 text-orange-700 border-orange-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Est. Ditolak (Revisi)
                    </Badge>
                );
            case "ESTIMATION_REJECTED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-red-100 text-red-700 border-red-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Est. Ditolak
                    </Badge>
                );
            case "IN_PROGRESS":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-blue-100 text-blue-700 border-blue-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Dikerjakan
                    </Badge>
                );
            case "PENDING_REVIEW":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-purple-100 text-purple-700 border-purple-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Menunggu Review Penyelesaian
                    </Badge>
                );
            case "REVIEW_REJECTED_REVISION":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-orange-100 text-orange-700 border-orange-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Ditolak (Revisi)
                    </Badge>
                );
            case "APPROVED_BMC":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-teal-100 text-teal-700 border-teal-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Penyelesaian Disetujui
                    </Badge>
                );
            case "COMPLETED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Selesai
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        {status}
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-3 md:hidden">
            {reports.map((report) => (
                <Card
                    key={report.reportNumber}
                    className="shadow-sm overflow-hidden cursor-pointer"
                    onClick={() =>
                        router.push(`/reports/${report.reportNumber}`)
                    }
                >
                    <CardContent>
                        {/* Header: Report # & Status */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {report.status === "DRAFT"
                                        ? "DRAFT"
                                        : report.reportNumber}
                                </span>
                                <h3 className="font-semibold text-sm line-clamp-1 leading-tight">
                                    {report.storeName || "—"}
                                </h3>
                            </div>
                            {getStatusBadge(report.status)}
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1.5 col-span-2">
                                <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                                <span className="truncate">
                                    {report.branchName}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0 text-primary/70" />
                                <span>{formatDate(report.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 shrink-0 text-primary/70" />
                                <span className="font-medium text-foreground">
                                    {formatCurrency(report.totalEstimation)}
                                </span>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2 border-t flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                                {report._count.items} item perbaikan
                            </span>
                            {(() => {
                                const cfg = MOBILE_ACTION_CONFIG[report.status];
                                if (!cfg) return null;
                                return (
                                    <Button
                                        variant={
                                            cfg.cta ? "outline" : "secondary"
                                        }
                                        size="sm"
                                        className={`h-7 text-xs px-3 gap-1.5 ${
                                            cfg.cta
                                                ? "border-primary/40 text-primary hover:bg-primary/5"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                        onClick={(e) => e.stopPropagation()}
                                        asChild
                                    >
                                        <Link
                                            href={
                                                report.status ===
                                                    "ESTIMATION_REJECTED_REVISION" ||
                                                report.status ===
                                                    "REVIEW_REJECTED_REVISION"
                                                    ? `/reports/revisi/${report.reportNumber}`
                                                    : `/reports/${report.reportNumber}`
                                            }
                                        >
                                            {cfg.icon}
                                            {cfg.label}
                                        </Link>
                                    </Button>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
