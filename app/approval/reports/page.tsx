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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Search,
    MapPin,
    Calendar,
    Clock,
    XCircle,
    CheckCircle2,
    Building2,
    DollarSign,
    Image as ImageIcon,
    User,
    Package,
    ArrowRight,
    Eye,
} from "lucide-react";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import Image from "next/image";

// --- MOCK DATA ---
const MOCK_APPROVAL_LIST = [
    {
        id: "RPT-2024-008",
        store: "Alfamart Cikokol Raya",
        storeId: "T001",
        reporter: "Budi Santoso (Store Leader)",
        address: "Jl. Jend. Sudirman No. 45, Tangerang",
        status: "waiting_approval",
        date: "2024-02-12",
        totalCost: 450000,
        checklistItems: [
            {
                area: "Area Kasir",
                condition: "Rusak Berat",
                note: "Lampu utama kedip-kedip parah, customer komplain pusing.",
                photos: ["/assets/floor.png"],
                itemsNeeded: [
                    { name: "Lampu LED Philips 18W", qty: 2, price: 75000 },
                    { name: "Starter Lampu", qty: 2, price: 15000 },
                ],
            },
            {
                area: "Gudang Belakang",
                condition: "Rusak Ringan",
                note: "Gagang pintu mulai longgar.",
                photos: ["/assets/floor2.jpeg"],
                itemsNeeded: [
                    { name: "Handle Pintu Standar", qty: 1, price: 150000 },
                    { name: "Sekrup & Fisher", qty: 1, price: 20000 },
                ],
            },
        ],
    },
    {
        id: "RPT-2024-007",
        store: "Alfamart Modernland",
        storeId: "T023",
        reporter: "Siti Aminah",
        address: "Jl. Hartono Raya, Modernland, Tangerang",
        status: "rejected",
        rejectionReason: "Foto kurang jelas.",
        date: "2024-02-11",
        totalCost: 120000,
        checklistItems: [
            {
                area: "Toilet Pengunjung",
                condition: "Rusak Sedang",
                note: "Kran air patah.",
                photos: ["/assets/floor3.jpeg"],
                itemsNeeded: [{ name: "Kran Air Onda", qty: 1, price: 120000 }],
            },
        ],
    },
];

export default function ApprovalReportsPage() {
    const [selectedReport, setSelectedReport] = useState<
        (typeof MOCK_APPROVAL_LIST)[0] | null
    >(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("waiting");

    // Filter Logic
    const filteredReports = MOCK_APPROVAL_LIST.filter((report) => {
        const matchesSearch =
            report.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTab =
            activeTab === "waiting"
                ? report.status === "waiting_approval"
                : activeTab === "rejected"
                  ? report.status === "rejected"
                  : true;

        return matchesSearch && matchesTab;
    });

    const handleViewDetail = (report: (typeof MOCK_APPROVAL_LIST)[0]) => {
        setSelectedReport(report);
        setIsDetailOpen(true);
    };

    const getStatusBadge = (status: string) => {
        if (status === "waiting_approval") {
            return (
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 gap-1 shadow-none">
                    <Clock className="w-3 h-3" /> Menunggu Approval
                </Badge>
            );
        }
        if (status === "rejected") {
            return (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1 shadow-none">
                    <XCircle className="w-3 h-3" /> Ditolak
                </Badge>
            );
        }
        return <Badge variant="outline">{status}</Badge>;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header
                variant="dashboard"
                title="List Laporan"
                description="Daftar laporan masuk"
                showBackButton
                backHref="/dashboard"
            />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
                {/* --- CONTROL BAR --- */}
                <div className="flex flex-col md:flex-row justify-between gap-4 items-end md:items-center">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full md:w-auto"
                    >
                        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="waiting">
                                Menunggu (
                                {
                                    MOCK_APPROVAL_LIST.filter(
                                        (r) => r.status === "waiting_approval",
                                    ).length
                                }
                                )
                            </TabsTrigger>
                            <TabsTrigger value="rejected">
                                Riwayat Ditolak
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari toko atau ID..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- MAIN LIST --- */}
                {filteredReports.length > 0 ? (
                    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[140px]">
                                            ID Laporan
                                        </TableHead>
                                        <TableHead className="w-[250px]">
                                            Toko & Pelapor
                                        </TableHead>
                                        <TableHead>Alamat</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Total Estimasi</TableHead>
                                        <TableHead className="text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReports.map((report) => (
                                        <TableRow
                                            key={report.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() =>
                                                handleViewDetail(report)
                                            }
                                        >
                                            <TableCell className="font-mono font-medium text-xs text-muted-foreground">
                                                {report.id}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm">
                                                        {report.store}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <User className="w-3 h-3" />{" "}
                                                        {report.reporter}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">
                                                        {report.address}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {report.date}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                Rp{" "}
                                                {report.totalCost.toLocaleString(
                                                    "id-ID",
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 h-8"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />{" "}
                                                    Detail
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile List Cards */}
                        <div className="md:hidden divide-y">
                            {filteredReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="p-4 active:bg-muted/50 cursor-pointer flex flex-col gap-3"
                                    onClick={() => handleViewDetail(report)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-sm">
                                                {report.store}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {report.id}
                                            </div>
                                        </div>
                                        {getStatusBadge(report.status)}
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        {report.address}
                                    </div>
                                    <div className="flex justify-between items-center text-xs mt-1">
                                        <div className="flex items-center gap-1 font-mono font-medium">
                                            <DollarSign className="w-3.5 h-3.5 text-green-600" />
                                            Rp{" "}
                                            {report.totalCost.toLocaleString(
                                                "id-ID",
                                            )}
                                        </div>
                                        <div className="flex items-center text-primary font-medium">
                                            Lihat Detail{" "}
                                            <ArrowRight className="w-3 h-3 ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Empty className="py-12 border border-dashed rounded-lg bg-card/50">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CheckCircle2 className="h-10 w-10 text-green-500/50" />
                            </EmptyMedia>
                            <EmptyTitle>Tidak ada data</EmptyTitle>
                            <EmptyDescription>
                                Tidak ada laporan dalam status ini.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </main>

            {/* --- DETAIL MODAL (CENTER DIALOG) --- */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-0 p-0">
                    {/* Header Modal */}
                    <div className="p-6 border-b sticky top-0 bg-background z-10">
                        <DialogHeader>
                            <div className="flex items-center justify-between mb-2">
                                <Badge
                                    variant="secondary"
                                    className="font-mono"
                                >
                                    {selectedReport?.id}
                                </Badge>
                                {selectedReport &&
                                    getStatusBadge(selectedReport.status)}
                            </div>
                            <DialogTitle className="text-xl">
                                {selectedReport?.store}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-1">
                                <MapPin className="w-3.5 h-3.5" />{" "}
                                {selectedReport?.address}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Body Modal - Checklist Loop */}
                    <div className="p-6 space-y-6">
                        {/* Info Pelapor */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    Pelapor
                                </div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />{" "}
                                    {selectedReport?.reporter}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    Tanggal Laporan
                                </div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />{" "}
                                    {selectedReport?.date}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    Total Estimasi
                                </div>
                                <div className="text-sm font-bold text-primary flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" /> Rp{" "}
                                    {selectedReport?.totalCost.toLocaleString(
                                        "id-ID",
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Checklist Area
                                & Kondisi
                            </h3>

                            {/* LOOPING ITEM CHECKLIST */}
                            {selectedReport?.checklistItems.map(
                                (item, index) => (
                                    <Card
                                        key={index}
                                        className="overflow-hidden border-muted"
                                    >
                                        <CardContent className="p-0">
                                            {/* Header Item: Area & Kondisi */}
                                            <div className="bg-muted/50 p-3 flex justify-between items-center border-b">
                                                <div className="font-medium text-sm">
                                                    {item.area}
                                                </div>
                                                <Badge
                                                    variant={
                                                        item.condition.includes(
                                                            "Berat",
                                                        )
                                                            ? "destructive"
                                                            : "outline"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {item.condition}
                                                </Badge>
                                            </div>

                                            <div className="p-4 grid md:grid-cols-2 gap-6">
                                                {/* Kiri: Keterangan & Foto */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            Catatan Kerusakan
                                                        </div>
                                                        <p className="text-sm text-foreground bg-muted/20 p-2 rounded border border-dashed">
                                                            &quot;{item.note}
                                                            &quot;
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                            <ImageIcon className="w-3 h-3" />{" "}
                                                            Bukti Foto
                                                        </div>
                                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                                            {item.photos.map(
                                                                (
                                                                    photo,
                                                                    pIdx,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            pIdx
                                                                        }
                                                                        className="h-24 w-24 shrink-0 rounded-md border bg-muted overflow-hidden relative group"
                                                                    >
                                                                        {/* Simulasi Gambar */}
                                                                        <Image
                                                                            src={
                                                                                photo
                                                                            }
                                                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                                                            alt="Bukti"
                                                                        />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Kanan: Tabel Barang & Harga */}
                                                <div className="bg-muted/10 rounded-lg border p-3 h-fit">
                                                    <div className="text-xs font-semibold mb-3 flex items-center gap-1">
                                                        <Package className="w-3.5 h-3.5" />{" "}
                                                        Kebutuhan Barang &
                                                        Estimasi
                                                    </div>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="h-8 hover:bg-transparent">
                                                                <TableHead className="text-[10px] h-8">
                                                                    Nama Barang
                                                                </TableHead>
                                                                <TableHead className="text-[10px] h-8 text-center">
                                                                    Qty
                                                                </TableHead>
                                                                <TableHead className="text-[10px] h-8 text-right">
                                                                    Total
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {item.itemsNeeded.map(
                                                                (
                                                                    goods,
                                                                    gIdx,
                                                                ) => (
                                                                    <TableRow
                                                                        key={
                                                                            gIdx
                                                                        }
                                                                        className="h-8 hover:bg-transparent"
                                                                    >
                                                                        <TableCell className="text-xs py-1">
                                                                            {
                                                                                goods.name
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-xs py-1 text-center">
                                                                            {
                                                                                goods.qty
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-xs py-1 text-right font-mono">
                                                                            {goods.price.toLocaleString(
                                                                                "id-ID",
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ),
                                                            )}
                                                            {/* Subtotal per Area */}
                                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                                <TableCell
                                                                    colSpan={2}
                                                                    className="text-xs font-semibold py-2"
                                                                >
                                                                    Subtotal
                                                                    Area
                                                                </TableCell>
                                                                <TableCell className="text-xs font-bold py-2 text-right">
                                                                    {item.itemsNeeded
                                                                        .reduce(
                                                                            (
                                                                                acc,
                                                                                curr,
                                                                            ) =>
                                                                                acc +
                                                                                curr.price,
                                                                            0,
                                                                        )
                                                                        .toLocaleString(
                                                                            "id-ID",
                                                                        )}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Footer Modal */}
                    <div className="p-4 border-t bg-background sticky bottom-0 flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setIsDetailOpen(false)}
                        >
                            Tutup Detail
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
}
