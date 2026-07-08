"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReportData } from "./bms-reports-list";
import { getReportStatusLabel } from "@/lib/report-status";
import { formatJakartaDate } from "@/lib/time";
import { Badge } from "@/components/ui/badge";

type StatusConfig = {
    label: string;
    badgeClass: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
    DRAFT: {
        label: getReportStatusLabel("DRAFT"),
        badgeClass: "bg-muted text-muted-foreground",
    },
    PENDING_ESTIMATION: {
        label: getReportStatusLabel("PENDING_ESTIMATION"),
        badgeClass: "bg-amber-100 text-amber-800",
    },
    ESTIMATION_APPROVED: {
        label: getReportStatusLabel("ESTIMATION_APPROVED"),
        badgeClass: "bg-emerald-100 text-emerald-800",
    },
    ESTIMATION_REJECTED_REVISION: {
        label: getReportStatusLabel("ESTIMATION_REJECTED_REVISION"),
        badgeClass: "bg-amber-100 text-amber-800",
    },
    ESTIMATION_REJECTED: {
        label: getReportStatusLabel("ESTIMATION_REJECTED"),
        badgeClass: "bg-red-100 text-red-800",
    },
    IN_PROGRESS: {
        label: getReportStatusLabel("IN_PROGRESS"),
        badgeClass: "bg-blue-100 text-blue-800",
    },
    PENDING_REVIEW: {
        label: getReportStatusLabel("PENDING_REVIEW"),
        badgeClass: "bg-blue-100 text-blue-800",
    },
    APPROVED_BMC: {
        label: getReportStatusLabel("APPROVED_BMC"),
        badgeClass: "bg-blue-100 text-blue-800",
    },
    REVIEW_REJECTED_REVISION: {
        label: getReportStatusLabel("REVIEW_REJECTED_REVISION"),
        badgeClass: "bg-amber-100 text-amber-800",
    },
    COMPLETED: {
        label: getReportStatusLabel("COMPLETED"),
        badgeClass: "bg-emerald-100 text-emerald-800",
    },
};

function formatDateShort(date: Date) {
    return formatJakartaDate(date);
}

function formatCurrency(amount: number) {
    if (!amount && amount !== 0) return null;
    return `Rp ${Number(amount).toLocaleString("id-ID")}`;
}

interface BmsReportsMobileProps {
    reports: ReportData[];
}

export function BmsReportsMobile({ reports }: BmsReportsMobileProps) {
    return (
        <div className="md:hidden flex flex-col">
            {reports.map((report) => {
                const cfg = STATUS_CONFIG[report.status] ?? {
                    label: getReportStatusLabel(report.status) || report.status,
                    badgeClass: "bg-muted text-muted-foreground",
                };

                const isCompleted = report.status === "COMPLETED";
                const driveUrl = report.reportFinalDriveUrl || report.completedPdfPath;

                const href =
                    isCompleted && driveUrl
                        ? driveUrl
                        : report.status === "DRAFT"
                          ? "/reports/create?restore=1"
                          : `/reports/${report.reportNumber}`;

                const targetAttrs =
                    isCompleted && driveUrl
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {};

                const storeLabel = report.storeCode
                    ? `${report.storeCode} – ${report.storeName || "—"}`
                    : report.storeName || "—";

                return (
                    <Link
                        prefetch={false}
                        key={report.reportNumber}
                        href={href}
                        {...targetAttrs}
                        className="flex flex-col gap-3 p-4 bg-transparent border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                        {/* Row 1: Report Number & Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex flex-col gap-0.5">
                                <span className="font-mono text-sm font-semibold text-primary underline underline-offset-2">
                                    {report.status === "DRAFT"
                                        ? "Laporan Draft"
                                        : `Laporan #${report.reportNumber}`}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                    {storeLabel}
                                </span>
                            </div>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold border-transparent shadow-none shrink-0",
                                    cfg.badgeClass
                                )}
                            >
                                {cfg.label}
                            </Badge>
                        </div>

                        {/* Row 2: Grid for Dates and Amounts */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
                            {/* Dates Column */}
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-0.5">
                                        Dibuat
                                    </span>
                                    <span className="text-[11px] font-medium text-foreground/80">
                                        {formatDateShort(report.createdAt)}
                                    </span>
                                </div>
                                {report.finishedAt && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-widest text-emerald-600/70 font-semibold mb-0.5">
                                            Selesai
                                        </span>
                                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-500">
                                            {formatDateShort(report.finishedAt)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Amounts Column */}
                            <div className="flex flex-col gap-2 items-end text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-0.5">
                                        Estimasi
                                    </span>
                                    <span className="text-[11px] font-medium text-foreground/80">
                                        {formatCurrency(report.totalEstimation) || "Rp 0"}
                                    </span>
                                </div>
                                {(isCompleted || report.totalRealisasi > 0) && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-0.5">
                                            Realisasi
                                        </span>
                                        <span className="text-[11px] font-medium text-foreground/80">
                                            {formatCurrency(report.totalRealisasi) || "Rp 0"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
