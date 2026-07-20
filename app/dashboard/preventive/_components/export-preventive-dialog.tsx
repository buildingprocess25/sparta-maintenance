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
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { getJakartaYear } from "@/lib/time";

export function ExportPreventiveDialog({
    branches,
    showBranchFilter = true,
}: {
    branches: string[];
    showBranchFilter?: boolean;
}) {
    const currentYear = getJakartaYear();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filters for export
    const [storeQuery, setStoreQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState<string>("all");
    const [year, setYear] = useState<number>(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState<string>("all");

    const handleExport = async () => {
        setIsLoading(true);
        const toastId = toast.loading(
            "Menyiapkan file ekspor Checklist Preventif...",
        );

        try {
            const res = await fetch("/api/admin/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filter: {
                        searchQuery: storeQuery || undefined,
                        branchName:
                            !showBranchFilter || selectedBranch === "all"
                                ? undefined
                                : [selectedBranch],
                        year: year,
                        preventiveQuarter:
                            selectedQuarter === "all"
                                ? "all"
                                : Number(selectedQuarter),
                    },
                    sheets: ["preventive"], // Only export preventive sheet
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
            const quarterName =
                selectedQuarter === "all"
                    ? "Semua_Triwulan"
                    : `TW${selectedQuarter}`;
            const branchName = showBranchFilter
                ? selectedBranch === "all"
                    ? "Semua_Cabang"
                    : selectedBranch
                : "Cabang_Akun";
            a.download = `Rekap_Preventif_${branchName}_Tahun_${year}_${quarterName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File berhasil diunduh", { id: toastId });
            setOpen(false); // Close dialog on success
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Gagal mengekspor data";
            toast.error(message, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Download data-icon="inline-start" />
                    Ekspor XLSX
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Checklist Preventif</DialogTitle>
                    <DialogDescription>
                        Unduh rekap checklist preventif dalam format Excel.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {showBranchFilter ? (
                        <div className="grid gap-2">
                            <Label>Cabang</Label>
                            <Select
                                value={selectedBranch}
                                onValueChange={setSelectedBranch}
                            >
                                <SelectTrigger className="w-full text-sm h-10">
                                    <SelectValue placeholder="Pilih Cabang" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectItem value="all">
                                        Semua Cabang
                                    </SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b} value={b}>
                                            {b}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}
                    <div className="grid gap-2">
                        <Label>Tahun</Label>
                        <Select
                            value={year.toString()}
                            onValueChange={(val) => setYear(parseInt(val))}
                        >
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Triwulan</Label>
                        <Select
                            value={selectedQuarter}
                            onValueChange={setSelectedQuarter}
                        >
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih Triwulan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua Triwulan
                                </SelectItem>
                                <SelectItem value="1">
                                    Triwulan 1 - Jan-Mar
                                </SelectItem>
                                <SelectItem value="2">
                                    Triwulan 2 - Apr-Jun
                                </SelectItem>
                                <SelectItem value="3">
                                    Triwulan 3 - Jul-Sep
                                </SelectItem>
                                <SelectItem value="4">
                                    Triwulan 4 - Okt-Des
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Nama / Kode Toko</Label>
                        <Input
                            placeholder="Opsional, biarkan kosong untuk unduh semua toko di cabang"
                            value={storeQuery}
                            onChange={(e) => setStoreQuery(e.target.value)}
                        />
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
