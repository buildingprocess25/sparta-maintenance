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
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
    { value: "all", label: "Semua Status" },
    { value: "PENDING_ESTIMATION", label: "Menunggu Persetujuan Estimasi" },
    { value: "ESTIMATION_APPROVED", label: "Estimasi Disetujui" },
    {
        value: "ESTIMATION_REJECTED_REVISION",
        label: "Estimasi Ditolak (Revisi)",
    },
    { value: "ESTIMATION_REJECTED", label: "Estimasi Ditolak" },
    { value: "IN_PROGRESS", label: "Sedang Dikerjakan" },
    { value: "PENDING_REVIEW", label: "Menunggu Review Penyelesaian" },
    { value: "APPROVED_BMC", label: "Menunggu Persetujuan Final BNM" },
    {
        value: "REVIEW_REJECTED_REVISION",
        label: "Penyelesaian Ditolak (Revisi)",
    },
    { value: "COMPLETED", label: "Selesai" },
];

export function ExportReportsDialog({ branches }: { branches: string[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filters for export (independent of table filters)
    const [bmsQuery, setBmsQuery] = useState("");
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [status, setStatus] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const handleExport = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Menyiapkan file ekspor...");

        try {
            const res = await fetch("/api/admin/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filter: {
                        bmsQuery: bmsQuery || undefined,
                        branchName:
                            selectedBranches.length === 0
                                ? undefined
                                : selectedBranches,
                        status: status === "all" ? undefined : status,
                        fromDate: fromDate || undefined,
                        toDate: toDate || undefined,
                    },
                    sheets: ["reports"], // Only export reports sheet
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal mengekspor data");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Rekap_Laporan_Maintenance_${format(new Date(), "yyyyMMdd")}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File berhasil diunduh", { id: toastId });
            setOpen(false); // Close dialog on success
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 text-xs">
                    <Download className="w-4 h-4" />
                    Ekspor XLSX
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Laporan Maintenance</DialogTitle>
                    <DialogDescription>
                        Pilih kriteria data laporan yang ingin Anda ekspor ke
                        Excel. Filter ini tidak terikat dengan filter tabel.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 ">
                    <div className="grid gap-2">
                        <Label>Cabang</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal text-sm px-3 h-10"
                                >
                                    {selectedBranches.length === 0
                                        ? "Semua Cabang"
                                        : selectedBranches.length === 1
                                          ? selectedBranches[0]
                                          : `${selectedBranches.length} Cabang Dipilih`}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-75 overflow-y-auto">
                                <DropdownMenuCheckboxItem
                                    checked={selectedBranches.length === 0}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedBranches([]);
                                    }}
                                >
                                    Semua Cabang
                                </DropdownMenuCheckboxItem>
                                {branches.map((b) => (
                                    <DropdownMenuCheckboxItem
                                        key={b}
                                        checked={selectedBranches.includes(b)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedBranches([
                                                    ...selectedBranches,
                                                    b,
                                                ]);
                                            } else {
                                                setSelectedBranches(
                                                    selectedBranches.filter(
                                                        (sb) => sb !== b,
                                                    ),
                                                );
                                            }
                                        }}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {b}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
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
                    <div className="grid gap-2">
                        <Label>Nama / NIK BMS</Label>
                        <Input
                            placeholder="Opsional"
                            value={bmsQuery}
                            onChange={(e) => setBmsQuery(e.target.value)}
                        />
                    </div>
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
