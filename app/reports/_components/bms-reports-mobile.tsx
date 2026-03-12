"use client";

import React from "react";
import { Building2, CalendarDays, ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReportData } from "./bms-reports-list";

type StatusConfig = {
    label: string;
    badge: string;
    bar: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
    DRAFT: {
        label: "Draft",
        badge: "bg-gray-100 text-gray-600",
        bar: "bg-gray-300",
    },
    PENDING_ESTIMATION: {
        label: "Menunggu Estimasi",
        badge: "bg-yellow-100 text-yellow-700",
        bar: "bg-yellow-400",
    },
    ESTIMATION_APPROVED: {
        label: "Siap Dikerjakan",
        badge: "bg-green-100 text-green-700",
        bar: "bg-green-500",
    },
    ESTIMATION_REJECTED_REVISION: {
        label: "Est. Ditolak — Revisi",
        badge: "bg-orange-100 text-orange-700",
        bar: "bg-orange-500",
    },
    ESTIMATION_REJECTED: {
        label: "Est. Ditolak",
        badge: "bg-red-100 text-red-700",
        bar: "bg-red-500",
    },
    IN_PROGRESS: {
        label: "Sedang Dikerjakan",
        badge: "bg-blue-100 text-blue-700",
        bar: "bg-blue-500",
    },
    PENDING_REVIEW: {
        label: "Menunggu Review",
        badge: "bg-purple-100 text-purple-700",
        bar: "bg-purple-500",
    },
    REVIEW_REJECTED_REVISION: {
        label: "Pekerjaan Ditolak — Revisi",
        badge: "bg-orange-100 text-orange-700",
        bar: "bg-orange-500",
    },
    COMPLETED: {
        label: "Selesai",
        badge: "bg-emerald-100 text-emerald-700",
        bar: "bg-emerald-500",
    },
};

function formatDateShort(date: Date) {
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCurrency(amount: number) {
    if (!amount) return null;
    return `Rp ${Number(amount).toLocaleString("id-ID")}`;
}

interface BmsReportsMobileProps {
    reports: ReportData[];
}

export function BmsReportsMobile({ reports }: BmsReportsMobileProps) {
    return (
        <div className="md:hidden rounded-xl border overflow-hidden divide-y bg-card shadow-sm">
            {reports.map((report) => {
                const cfg = STATUS_CONFIG[report.status] ?? {
                    label: report.status,
                    badge: "bg-muted text-muted-foreground",
                    bar: "bg-muted",
                };

                const href =
                    report.status === "DRAFT"
                        ? "/reports/create?restore=1"
                        : `/reports/${report.reportNumber}`;

                const estFormatted = formatCurrency(report.totalEstimation);
                const storeLabel = report.storeCode
                    ? `${report.storeCode} – ${report.storeName || "—"}`
                    : report.storeName || "—";

                return (
                    <Link
                        key={report.reportNumber}
                        href={href}
                        className="flex items-stretch hover:bg-muted/40 active:bg-muted/60 transition-colors"
                    >
                        {/* Left accent bar */}
                        <span className={cn("w-1 shrink-0", cfg.bar)} />

                        {/* Content */}
                        <div className="flex-1 min-w-0 px-3 py-3">
                            {/* Row 1: store code + name */}
                            <p className="font-semibold text-sm leading-tight truncate mb-1">
                                {storeLabel}
                            </p>

                            {/* Row 2: status badge */}
                            <span
                                className={cn(
                                    "inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap mb-2",
                                    cfg.badge,
                                )}
                            >
                                {cfg.label}
                            </span>

                            {/* Row 3: report number + branch */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                                <span className="font-mono shrink-0">
                                    {report.status === "DRAFT"
                                        ? "DRAFT"
                                        : report.reportNumber}
                                </span>
                                <span className="flex items-center gap-1 min-w-0">
                                    <Building2 className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                        {report.branchName}
                                    </span>
                                </span>
                            </div>

                            {/* Row 4: date + rusak count + estimation */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3 shrink-0" />
                                    {formatDateShort(report.createdAt)}
                                </span>
                                {report.rusakCount > 0 && (
                                    <span className="flex items-center gap-1 text-red-600">
                                        <Wrench className="h-3 w-3 shrink-0" />
                                        {report.rusakCount} perlu perbaikan
                                    </span>
                                )}
                                {estFormatted && (
                                    <span className="font-medium text-foreground">
                                        {estFormatted}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right chevron */}
                        <div className="flex items-center pr-3 text-muted-foreground/40">
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
