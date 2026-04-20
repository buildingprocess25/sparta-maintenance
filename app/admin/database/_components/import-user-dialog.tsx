"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { adminImportUsers, type ImportResult } from "../actions";

function generateAdminUserTemplate() {
    const headers = ["NIK", "Nama", "Email", "Role", "Branch"];
    const exampleData = [
        ["12345678", "Budi Santoso", "budi@email.com", "BMS", "Jakarta Pusat"],
        [
            "87654321",
            "Siti Rahayu",
            "siti@email.com",
            "BRANCH_ADMIN",
            "Bandung",
        ],
        ["11111111", "Admin Pusat", "admin@email.com", "ADMIN", ""],
        [
            "22222222",
            "Manajer BnM",
            "bnm@email.com",
            "BNM_MANAGER",
            "Surabaya",
        ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    ws["!cols"] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 18 },
        { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template User");
    XLSX.writeFile(wb, "template_import_user_admin.xlsx");
}

export function AdminImportUserDialog() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setResult(null);
        setProgress(0);
    }, []);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".xlsx")) {
            toast.error("Format file tidak valid", {
                description: `File ${file.name} tidak didukung. Upload file .xlsx sesuai template.`,
            });
            return;
        }

        setSelectedFile(file);
        setResult(null);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".xlsx")) {
            toast.error("Format file tidak valid", {
                description: `File ${file.name} tidak didukung. Upload file .xlsx sesuai template.`,
            });
            return;
        }

        setSelectedFile(file);
        setResult(null);
    }

    function handleImport() {
        if (!selectedFile) return;

        setProgress(0);
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 98) return 98;
                const remaining = 98 - prev;
                const step =
                    prev < 80
                        ? Math.max(2, remaining * 0.2)
                        : Math.max(0.4, remaining * 0.08);
                return Math.min(98, prev + step);
            });
        }, 250);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("file", selectedFile);

                const importResult = await adminImportUsers(formData);
                setResult(importResult);

                if (importResult.success && importResult.failed === 0) {
                    toast.success("Import user berhasil", {
                        description: `Diproses ${importResult.total} baris: ${importResult.created} dibuat, ${importResult.updated} diperbarui, ${importResult.skipped} dilewati.`,
                    });
                } else if (importResult.success) {
                    const firstError = importResult.errors[0];
                    toast.warning("Import user selesai dengan catatan", {
                        description: firstError
                            ? `${importResult.failed} baris gagal. Contoh: ${firstError}`
                            : `${importResult.failed} baris gagal. Lihat detail di panel hasil.`,
                    });
                } else {
                    toast.error("Import user gagal", {
                        description:
                            importResult.errors[0] ??
                            "Terjadi kendala saat memproses file.",
                    });
                }
            } catch {
                toast.error("Import user gagal", {
                    description: "Silakan coba lagi.",
                });
            } finally {
                clearInterval(progressInterval);
                setProgress(100);
            }
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    Import
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Import Data User</DialogTitle>
                    <DialogDescription>
                        Import data user secara massal melalui file XLSX.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Step 1: Download template */}
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                            <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-2 flex-1">
                                <p className="text-sm font-medium">
                                    Langkah 1: Unduh Template
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Kolom:{" "}
                                    <strong>
                                        NIK, Nama, Email, Role, Branch
                                    </strong>
                                    . Role yang valid:{" "}
                                    <strong>
                                        BMS, BMC, BNM_MANAGER, BRANCH_ADMIN,
                                        ADMIN
                                    </strong>
                                    . Kolom Branch dikosongkan untuk role ADMIN.
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={generateAdminUserTemplate}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Unduh Template
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Upload file */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            Langkah 2: Upload File
                        </p>
                        <div
                            className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer p-6 text-center"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {selectedFile ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium">
                                        {selectedFile.name}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                            setResult(null);
                                            if (fileInputRef.current)
                                                fileInputRef.current.value = "";
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">
                                        Klik atau seret file .xlsx ke sini
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    {isPending && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Mengimport data...
                                </span>
                                <span className="font-medium">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    {/* Results */}
                    {result && !isPending && (
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                {result.success && result.failed === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : result.success ? (
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <span className="font-medium text-sm">
                                    {result.success
                                        ? "Import Selesai"
                                        : "Import Gagal"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="rounded-md bg-muted/50 p-2">
                                    <p className="text-lg font-semibold text-green-600">
                                        {result.created}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Dibuat
                                    </p>
                                </div>
                                <div className="rounded-md bg-muted/50 p-2">
                                    <p className="text-lg font-semibold text-blue-600">
                                        {result.updated}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Diperbarui
                                    </p>
                                </div>
                                <div className="rounded-md bg-muted/50 p-2">
                                    <p className="text-lg font-semibold text-yellow-600">
                                        {result.skipped}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Dilewati
                                    </p>
                                </div>
                                <div className="rounded-md bg-muted/50 p-2">
                                    <p className="text-lg font-semibold text-red-600">
                                        {result.failed}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Gagal
                                    </p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="max-h-32 overflow-y-auto rounded-md bg-destructive/5 p-3 space-y-1">
                                    {result.errors.map((err, i) => (
                                        <p
                                            key={i}
                                            className="text-xs text-destructive"
                                        >
                                            {err}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOpen(false);
                            resetState();
                        }}
                    >
                        {result ? "Tutup" : "Batal"}
                    </Button>
                    {!result && (
                        <Button
                            type="button"
                            disabled={!selectedFile || isPending}
                            onClick={handleImport}
                            className="gap-1.5"
                        >
                            <Upload className="h-4 w-4" />
                            Import
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
