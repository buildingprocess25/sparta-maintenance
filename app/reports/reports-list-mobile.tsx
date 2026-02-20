"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReportData } from "./reports-list";

interface ReportsListMobileProps {
    reports: ReportData[];
}

export function ReportsListMobile({ reports }: ReportsListMobileProps) {
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
            case "PENDING_APPROVAL":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Menunggu
                    </Badge>
                );
            case "APPROVED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-green-100 text-green-700 border-green-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Disetujui
                    </Badge>
                );
            case "REJECTED":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-red-100 text-red-700 border-red-200 px-2 py-0.5 text-[10px] font-medium"
                    >
                        Ditolak
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

    const getActionUrl = (report: ReportData) => {
        if (report.status === "DRAFT" || report.status === "REJECTED") {
            return `/reports/edit/${report.id}`;
        }
        return `/reports/${report.reportNumber}`;
    };

    return (
        <div className="space-y-3 md:hidden">
            {reports.map((report) => (
                <Card key={report.id} className="shadow-sm overflow-hidden">
                    <CardContent>
                        {/* Header: Report # & Status */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {report.reportNumber}
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
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs px-3 bg-primary/10 text-primary hover:bg-primary/20"
                                asChild
                            >
                                <Link href={getActionUrl(report)}>
                                    {report.status === "DRAFT" ||
                                    report.status === "REJECTED" ? (
                                        <>
                                            <Pencil className="h-3 w-3 mr-1.5" />
                                            Edit
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-3 w-3 mr-1.5" />
                                            Detail
                                        </>
                                    )}
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
