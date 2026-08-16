"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";
import { Label } from "@/components/ui/label";
import { STORE_BRAND_OPTIONS, StoreBrandFilter } from "@/lib/store-brand-filter";
import * as XLSX from "xlsx";
import { getMaterialAnalysisData } from "./actions";

export function ExportMaterialAnalysisDialog({
    branches,
}: {
    branches: string[];
}) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filters for export (starts with defaults)
    const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [branchName, setBranchName] = useState<string>("Semua Cabang");
    const [brand, setBrand] = useState<string>("Semua Brand");

    const handleExport = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Menyiapkan file ekspor...");

        try {
            const filters = {
                fromDate,
                toDate,
                branchName,
                brand,
            };

            const data = await getMaterialAnalysisData(filters);

            if (data.length === 0) {
                toast.error("Tidak ada data untuk diekspor pada rentang filter tersebut", { id: toastId });
                setIsLoading(false);
                return;
            }

            const exportData = data.map(row => ({
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

            toast.success("File berhasil diunduh", { id: toastId });
            setOpen(false); // Close dialog on success
        } catch (error: unknown) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Gagal mengekspor data",
                { id: toastId },
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                    <Download className="size-4 mr-2" />
                    Ekspor XLSX
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Analisa Material</DialogTitle>
                    <DialogDescription>
                        Pilih kriteria data material yang ingin Anda ekspor ke
                        Excel. Filter ini tidak terikat dengan filter tabel saat ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Dari Tanggal</Label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sampai Tanggal</Label>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Cabang</Label>
                        <Select value={branchName} onValueChange={setBranchName}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih cabang" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="Semua Cabang">Semua Cabang</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b} value={b}>
                                        {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Brand</Label>
                        <Select value={brand} onValueChange={setBrand}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih brand" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua Brand">Semua Brand</SelectItem>
                                {STORE_BRAND_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleExport} disabled={isLoading}>
                        {isLoading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Unduh File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
