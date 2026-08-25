"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { STORE_BRAND_OPTIONS, type StoreBrandFilter } from "@/lib/store-brand-filter";
import type { PreventiveQuarter } from "../actions";

type MatrixExportStatus = "all" | "completed" | "pending";

type ExportPreventiveMatrixDialogProps = {
    branches: string[];
    availableYears: number[];
    defaultBranch: string;
    currentBrand: StoreBrandFilter;
    currentYear: number;
    currentQuarter: PreventiveQuarter;
    showBranchFilter?: boolean;
    showBrandFilter?: boolean;
};

const quarterOptions: { value: PreventiveQuarter; label: string }[] = [
    { value: 1, label: "Triwulan 1 - Jan-Mar" },
    { value: 2, label: "Triwulan 2 - Apr-Jun" },
    { value: 3, label: "Triwulan 3 - Jul-Sep" },
    { value: 4, label: "Triwulan 4 - Okt-Des" },
];

const statusOptions: { value: MatrixExportStatus; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "completed", label: "Sudah Checklist" },
    { value: "pending", label: "Belum Checklist" },
];

function getFileNameFromDisposition(disposition: string | null) {
    if (!disposition) return null;

    const match = /filename="([^"]+)"/.exec(disposition);
    return match?.[1] ?? null;
}

function safeFileSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

export function ExportPreventiveMatrixDialog({
    branches,
    availableYears,
    defaultBranch,
    currentBrand,
    currentYear,
    currentQuarter,
    showBranchFilter = true,
    showBrandFilter = false,
}: ExportPreventiveMatrixDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(defaultBranch || "all");
    const [selectedBrand, setSelectedBrand] = useState<StoreBrandFilter>(currentBrand);
    const [year, setYear] = useState<number>(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState<string>(
        String(currentQuarter),
    );
    const [status, setStatus] = useState<MatrixExportStatus>("all");

    useEffect(() => {
        if (!open) return;

        setSelectedBranch(defaultBranch || "all");
        setSelectedBrand(currentBrand);
        setYear(currentYear);
        setSelectedQuarter(String(currentQuarter));
        setStatus("all");
    }, [currentBrand, currentQuarter, currentYear, defaultBranch, open]);

    const handleExport = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Menyiapkan matriks preventif...");
        const branchName = showBranchFilter
            ? selectedBranch === "all"
                ? "Semua_Cabang"
                : selectedBranch
            : "Cabang_Akun";

        try {
            const res = await fetch("/api/dashboard/preventive/annual-matrix-export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    branchName:
                        !showBranchFilter || selectedBranch === "all"
                            ? undefined
                            : selectedBranch,
                    brand: selectedBrand,
                    year,
                    quarter: Number(selectedQuarter),
                    status,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Gagal mengekspor matriks");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                getFileNameFromDisposition(res.headers.get("Content-Disposition")) ??
                `Matriks_Preventif_${safeFileSegment(branchName)}_TW${selectedQuarter}_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success("File matriks berhasil diunduh", { id: toastId });
            setOpen(false);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Gagal mengekspor matriks";
            toast.error(message, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Download data-icon="inline-start" />
                    Ekspor Matriks
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Matriks Tahunan</DialogTitle>
                    <DialogDescription>
                        Unduh matriks checklist preventif tahunan dengan ringkasan nominal per cabang.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    {showBranchFilter ? (
                        <Field>
                            <FieldLabel>Cabang</FieldLabel>
                            <Select
                                value={selectedBranch}
                                onValueChange={setSelectedBranch}
                            >
                                <SelectTrigger className="w-full text-sm h-10">
                                    <SelectValue placeholder="Pilih Cabang" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua Cabang
                                        </SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch} value={branch}>
                                                {branch}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : null}
                    {showBrandFilter ? (
                        <Field>
                            <FieldLabel>Brand</FieldLabel>
                            <Select
                                value={selectedBrand}
                                onValueChange={(value) =>
                                    setSelectedBrand(value as StoreBrandFilter)
                                }
                            >
                                <SelectTrigger className="w-full text-sm h-10">
                                    <SelectValue placeholder="Pilih Brand" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    <SelectGroup>
                                        {STORE_BRAND_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : null}
                    <Field>
                        <FieldLabel>Tahun</FieldLabel>
                        <Select
                            value={year.toString()}
                            onValueChange={(value) => setYear(Number(value))}
                        >
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {availableYears.map((option) => (
                                        <SelectItem
                                            key={option}
                                            value={option.toString()}
                                        >
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel>Triwulan</FieldLabel>
                        <Select
                            value={selectedQuarter}
                            onValueChange={setSelectedQuarter}
                        >
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih Triwulan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {quarterOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value.toString()}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel>Status</FieldLabel>
                        <Select
                            value={status}
                            onValueChange={(value) =>
                                setStatus(value as MatrixExportStatus)
                            }
                        >
                            <SelectTrigger className="w-full text-sm h-10">
                                <SelectValue placeholder="Pilih Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {statusOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Batal
                    </Button>
                    <Button onClick={handleExport} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                            <Download data-icon="inline-start" />
                        )}
                        Unduh File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
