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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Filter,
    FileText,
    Clock,
    ArrowUpDown,
    Check,
    CheckCircle2,
    Eye,
} from "lucide-react";
import Link from "next/link";

// Mock Data — hanya laporan yang sudah selesai (approved & completed)
const MOCK_REPORTS = [
    {
        id: "RPT-2024-002",
        store: "Alfamart Hasyim Ashari",
        location: "Gudang Belakang",
        description: "Pipa wastafel bocor membasahi lantai",
        status: "approved",
        date: "2024-02-09",
        cost: 350000,
    },
    {
        id: "RPT-2024-005",
        store: "Alfamart Serpong Utara",
        location: "Ruang Atas Lt.2",
        description: "Plafond bocor saat hujan deras",
        status: "completed",
        date: "2024-02-06",
        cost: 1200000,
    },
    {
        id: "RPT-2024-007",
        store: "Alfamart Kelapa Dua",
        location: "Bagian Atap",
        description: "Genteng pecah di beberapa titik",
        status: "approved",
        date: "2024-02-04",
        cost: 500000,
    },
    {
        id: "RPT-2024-009",
        store: "Alfamart Alam Sutera",
        location: "Area Sales",
        description: "Lantai keramik retak dan terangkat",
        status: "completed",
        date: "2024-01-28",
        cost: 850000,
    },
];

export default function FinishedReportsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Filter Logic
    const filteredReports = MOCK_REPORTS.filter((report) => {
        const matchesSearch =
            report.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
            statusFilter === "all" || report.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 shadow-none"
                    >
                        <Check className="h-3 w-3" /> Disetujui
                    </Badge>
                );
            case "completed":
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 shadow-none"
                    >
                        <CheckCircle2 className="h-3 w-3" /> Selesai
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="Laporan Selesai"
                description="Riwayat laporan yang sudah disetujui dan selesai"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* Action Bar: Search, Filter */}
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-1 gap-2">
                        <div className="relative flex-1 md:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari toko atau ID laporan..."
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-auto bg-background">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua</SelectItem>
                                <SelectItem value="approved">
                                    Disetujui
                                </SelectItem>
                                <SelectItem value="completed">
                                    Selesai
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                                                    {report.store}
                                                </h3>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                                                    {report.id}
                                                </p>
                                            </div>
                                            {getStatusBadge(report.status)}
                                        </div>

                                        <div className="grid gap-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {report.location}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                <span>{report.date}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                                <span>
                                                    Rp{" "}
                                                    {report.cost.toLocaleString(
                                                        "id-ID",
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
                                                    href={`/reports/${report.id}`}
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
                                        <TableHead className="w-[100px]">
                                            ID Laporan
                                        </TableHead>
                                        <TableHead className="min-w-[200px]">
                                            Toko & Lokasi
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
                                        <TableHead className="w-[70px] text-center">
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
                                                {report.id}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-sm">
                                                        {report.store}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />{" "}
                                                        {report.location}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {report.date}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(report.status)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                Rp{" "}
                                                {report.cost.toLocaleString(
                                                    "id-ID",
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
