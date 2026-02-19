"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import {
    Search,
    MapPin,
    Calendar,
    FileText,
    Clock,
    ArrowUpDown,
    CheckCircle2,
    Eye,
} from "lucide-react";
import Link from "next/link";

// Same type as ReportData in reports-list
type ReportData = {
    id: string;
    reportNumber: string;
    storeName: string;
    branchName: string;
    status: string;
    totalEstimation: number;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        items: number;
    };
};

type FinishedListProps = {
    reports: ReportData[];
    total: number;
};

export default function FinishedList({ reports, total }: FinishedListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredReports = reports.filter((report) => {
        const matchesSearch =
            report.storeName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            report.reportNumber
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

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

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Riwayat Selesai"
                description={`${total} laporan — Laporan yang sudah selesai dikerjakan`}
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar: Search */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-1 gap-2">
                        <div className="relative flex-1 md:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari toko atau nomor laporan..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {filteredReports.length > 0 ? (
                    <>
                        {/* --- MOBILE VIEW: CARD LIST --- */}
                        <div className="space-y-3 md:hidden">
                            {filteredReports.map((report) => (
                                <Card key={report.id} className="shadow-sm">
                                    <CardContent>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-sm line-clamp-1">
                                                    {report.storeName || "—"}
                                                </h3>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                                                    {report.reportNumber}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 shadow-none"
                                            >
                                                <CheckCircle2 className="h-3 w-3" />{" "}
                                                Selesai
                                            </Badge>
                                        </div>

                                        <div className="grid gap-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {report.branchName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                    {formatDate(
                                                        report.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                    {formatCurrency(
                                                        report.totalEstimation,
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mobile Action Button */}
                                        <div className="mt-3 pt-3 border-t flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-xs"
                                                asChild
                                            >
                                                <Link
                                                    href={`/reports/${report.reportNumber}`}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Lihat Detail
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* --- DESKTOP VIEW: DATA TABLE --- */}
                        <div className="hidden md:block border rounded-lg shadow-sm bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="w-25">
                                            Nomor Laporan
                                        </TableHead>
                                        <TableHead className="min-w-50">
                                            Toko & Cabang
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                                                Tanggal{" "}
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Estimasi
                                        </TableHead>
                                        <TableHead className="w-17.5 text-center">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReports.map((report) => (
                                        <TableRow
                                            key={report.id}
                                            className="group"
                                        >
                                            <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                                {report.reportNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">
                                                        {report.storeName ||
                                                            "—"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />{" "}
                                                        {report.branchName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(report.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 shadow-none"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />{" "}
                                                    Selesai
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatCurrency(
                                                    report.totalEstimation,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/reports/${report.id}`}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Lihat Detail
                                                        </span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="bg-card border rounded-lg border-dashed">
                        <Empty className="py-16">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FileText className="h-10 w-10 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyTitle>
                                    Tidak ada laporan ditemukan
                                </EmptyTitle>
                                <EmptyDescription>
                                    {searchQuery
                                        ? "Coba ubah kata kunci pencarian atau filter Anda."
                                        : "Belum ada laporan yang selesai."}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
