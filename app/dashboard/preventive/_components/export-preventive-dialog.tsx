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

export function ExportPreventiveDialog({ branches }: { branches: string[] }) {
    const currentYear = new Date().getFullYear();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filters for export
    const [storeQuery, setStoreQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [year, setYear] = useState<number>(currentYear);

    const handleExport = async () => {
        if (!selectedBranch) {
            toast.error("Silakan pilih 1 cabang untuk diekspor");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Menyiapkan file ekspor Checklist Preventif...");

        try {
            const res = await fetch("/api/admin/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filter: {
                        searchQuery: storeQuery || undefined,
                        branchName: [selectedBranch], // Must be an array as expected by backend, but we restrict UI to 1
                        year: year,
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
            a.download = `Rekap_Preventif_${selectedBranch}_Tahun_${year}.xlsx`;
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

    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
                    <DialogTitle>Ekspor Checklist Preventif</DialogTitle>
                    <DialogDescription>
                        Unduh rekap checklist preventif dalam format Excel. Ekspor dibatasi maksimal 1 cabang untuk menjaga performa.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Cabang (Wajib)</Label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih 1 Cabang" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {branches.map((b) => (
                                    <SelectItem key={b} value={b}>
                                        {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                    <Button onClick={handleExport} disabled={isLoading || !selectedBranch}>
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
