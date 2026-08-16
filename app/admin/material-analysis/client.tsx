"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { getMaterialAnalysisData, type MaterialAnalysisRow, type MaterialAnalysisFilters } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconSearch, IconDownload, IconLoader2, IconDatabaseOff } from "@tabler/icons-react";
import { format, startOfMonth, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function MaterialAnalysisClient({ initialBranches = [] }: { initialBranches?: string[] }) {
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<MaterialAnalysisRow[]>([]);
    
    // Filters
    const [fromDate, setFromDate] = useState<string>(
        format(startOfMonth(new Date()), "yyyy-MM-dd")
    );
    const [toDate, setToDate] = useState<string>(
        format(endOfDay(new Date()), "yyyy-MM-dd")
    );
    const [branchName, setBranchName] = useState<string>("Semua Cabang");
    const [brand, setBrand] = useState<string>("Semua Brand");
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const loadData = () => {
        startTransition(async () => {
            try {
                const filters: MaterialAnalysisFilters = {
                    fromDate: new Date(fromDate).toISOString(),
                    toDate: endOfDay(new Date(toDate)).toISOString(),
                    branchName,
                    brand
                };
                const result = await getMaterialAnalysisData(filters);
                setData(result);
                setCurrentPage(1);
            } catch (error) {
                toast.error("Gagal memuat data analisa material");
                console.error(error);
            }
        });
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, branchName, brand]);

    // Client-side search filtering
    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        
        const query = searchQuery.toLowerCase();
        return data.filter(row => 
            row.itemName.toLowerCase().includes(query) ||
            row.materialName.toLowerCase().includes(query) ||
            row.storeCode.toLowerCase().includes(query) ||
            row.storeName.toLowerCase().includes(query) ||
            row.branchName.toLowerCase().includes(query) ||
            row.reportNumber.toLowerCase().includes(query) ||
            row.bmsName.toLowerCase().includes(query)
        );
    }, [data, searchQuery]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredData.slice(start, end);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const handleExport = () => {
        if (filteredData.length === 0) {
            toast.error("Tidak ada data untuk diekspor");
            return;
        }

        const exportData = filteredData.map(row => ({
            "Nomor Laporan": row.reportNumber,
            "Tanggal Selesai": format(new Date(row.finishedAt), "dd/MM/yyyy HH:mm"),
            "Cabang": row.branchName,
            "Kode Toko": row.storeCode,
            "Nama Toko": row.storeName,
            "Brand": row.brand,
            "BMS": row.bmsName,
            "Item Rusak": row.itemName,
            "Material": row.materialName,
            "Nominal Realisasi": row.realisasiNominal
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analisa Material");
        XLSX.writeFile(wb, `Analisa_Material_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-4">
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-1.5 w-full md:w-auto">
                    <label className="text-sm font-medium text-muted-foreground">Dari Tanggal</label>
                    <Input 
                        type="date" 
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5 w-full md:w-auto">
                    <label className="text-sm font-medium text-muted-foreground">Sampai Tanggal</label>
                    <Input 
                        type="date" 
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5 w-full md:w-[200px]">
                    <label className="text-sm font-medium text-muted-foreground">Cabang</label>
                    <Select value={branchName} onValueChange={setBranchName}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Cabang" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Semua Cabang">Semua Cabang</SelectItem>
                            {initialBranches.map(branch => (
                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 w-full md:w-[200px]">
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <Select value={brand} onValueChange={setBrand}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Brand" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Semua Brand">Semua Brand</SelectItem>
                            <SelectItem value="Alfamart">Alfamart</SelectItem>
                            <SelectItem value="Lawson">Lawson</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex-1" />
                
                <Button 
                    onClick={handleExport} 
                    disabled={isPending || filteredData.length === 0}
                    className="w-full md:w-auto"
                >
                    <IconDownload className="size-4 mr-2" />
                    Ekspor XLSX
                </Button>
            </Card>

            <Card className="p-4 space-y-4">
                <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari item, material, toko, cabang, no laporan..." 
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-9"
                    />
                </div>

                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[120px]">Tgl Selesai</TableHead>
                                <TableHead className="min-w-[150px]">Laporan</TableHead>
                                <TableHead className="min-w-[180px]">Toko</TableHead>
                                <TableHead className="min-w-[100px]">Cabang</TableHead>
                                <TableHead className="min-w-[150px]">BMS</TableHead>
                                <TableHead className="min-w-[200px]">Item Rusak</TableHead>
                                <TableHead className="min-w-[200px]">Material</TableHead>
                                <TableHead className="text-right min-w-[120px]">Realisasi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                            <IconLoader2 className="size-6 animate-spin" />
                                            <span>Memuat data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                            <IconDatabaseOff className="size-6" />
                                            <span>Tidak ada data ditemukan</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{format(new Date(row.finishedAt), "dd MMM yyyy")}</TableCell>
                                        <TableCell className="font-medium text-blue-600">{row.reportNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{row.storeName}</span>
                                                <span className="text-xs text-muted-foreground">{row.storeCode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{row.branchName}</TableCell>
                                        <TableCell>{row.bmsName}</TableCell>
                                        <TableCell>{row.itemName}</TableCell>
                                        <TableCell>{row.materialName}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(row.realisasiNominal)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {!isPending && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-muted-foreground">
                            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} baris
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </Button>
                            <div className="text-sm">
                                Halaman {currentPage} dari {totalPages}
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
