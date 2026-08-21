"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    X,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminImportAhoTickets } from "../actions";
import type { AhoImportResult } from "@/lib/jobs/aho-import";

type JobStatus = "idle" | "submitting" | "pending" | "processing" | "done" | "failed";

const POLL_INTERVAL_MS = 3_000; // poll setiap 3 detik
const MAX_POLL_DURATION_MS = 10 * 60 * 1_000; // batas keamanan 10 menit

export function ImportAhoTicketsDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
    const [result, setResult] = useState<AhoImportResult | null>(null);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollStartRef = useRef<number>(0);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const resetState = useCallback(() => {
        stopPolling();
        setSelectedFile(null);
        setJobStatus("idle");
        setResult(null);
        setProgress(0);
    }, [stopPolling]);

    // Cleanup saat komponen unmount
    useEffect(() => {
        return () => stopPolling();
    }, [stopPolling]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith(".xlsx")) {
            toast.error("Format file tidak valid", {
                description: "Hanya file .xlsx yang diterima.",
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
                description: "Hanya file .xlsx yang diterima.",
            });
            return;
        }
        setSelectedFile(file);
        setResult(null);
    }

    const startPolling = useCallback(
        (jobId: string) => {
            pollStartRef.current = Date.now();
            // Progress simulasi lambat selama polling
            setProgress(10);

            pollIntervalRef.current = setInterval(async () => {
                // Safety: hentikan polling jika terlalu lama
                if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
                    stopPolling();
                    setJobStatus("failed");
                    setProgress(100);
                    toast.error("Proses import timeout", {
                        description:
                            "Proses memakan waktu terlalu lama. Silakan refresh halaman untuk memeriksa apakah data sudah tersimpan.",
                    });
                    return;
                }

                try {
                    const res = await fetch(`/api/admin/import-aho/${jobId}`);
                    if (!res.ok) {
                        // Jangan langsung fail — bisa jadi network hiccup
                        return;
                    }
                    const data = await res.json();

                    if (data.status === "processing") {
                        setJobStatus("processing");
                        // Animasi progress lambat saat processing
                        setProgress((prev) => Math.min(90, prev + 5));
                    } else if (data.status === "done") {
                        stopPolling();
                        setJobStatus("done");
                        setProgress(100);
                        setResult(data.result as AhoImportResult);
                        router.refresh();

                        const r = data.result as AhoImportResult;
                        if (r.errors.length === 0) {
                            toast.success("Import tiket AHO berhasil", {
                                description: `${r.created} tiket tersimpan dari ${r.total} baris.`,
                            });
                        } else {
                            toast.warning("Import selesai dengan catatan", {
                                description: `${r.skipped} baris dilewati. Lihat detail di panel hasil.`,
                            });
                        }
                    } else if (data.status === "failed") {
                        stopPolling();
                        setJobStatus("failed");
                        setProgress(100);
                        setResult(data.result as AhoImportResult | null);
                        toast.error("Import tiket AHO gagal", {
                            description:
                                data.errorMessage ??
                                data.result?.errors?.[0] ??
                                "Terjadi kendala saat import.",
                        });
                    }
                    // status "pending" → biarkan polling terus
                } catch {
                    // Network error sementara — polling tetap jalan
                }
            }, POLL_INTERVAL_MS);
        },
        [stopPolling, router],
    );

    async function handleImport() {
        if (!selectedFile) return;

        setJobStatus("submitting");
        setProgress(5);

        const formData = new FormData();
        formData.append("file", selectedFile);

        const enqueueResult = await adminImportAhoTickets(formData);

        if ("error" in enqueueResult) {
            setJobStatus("idle");
            setProgress(0);
            toast.error("Import tiket AHO gagal", {
                description: enqueueResult.error,
            });
            return;
        }

        setJobStatus("pending");
        startPolling(enqueueResult.jobId);
    }

    const isProcessing =
        jobStatus === "submitting" || jobStatus === "pending" || jobStatus === "processing";
    const isDone = jobStatus === "done" || jobStatus === "failed";

    const statusLabel: Record<JobStatus, string> = {
        idle: "",
        submitting: "Mengunggah file...",
        pending: "Menunggu giliran proses...",
        processing: "Mensinkronisasi data...",
        done: "",
        failed: "",
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                    <Upload className="h-3.5 w-3.5" />
                    Import XLSX
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Import Data Tiket AHO</DialogTitle>
                    <DialogDescription>
                        Sinkronisasi snapshot YTD tiket AHO. Sistem hanya menyimpan status <strong>New</strong> dan <strong>Progress</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Step 1 — Info file */}
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                            <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div className="space-y-2 flex-1">
                                <p className="text-sm font-medium">Langkah 1: Siapkan File</p>
                                <p className="text-xs text-muted-foreground">
                                    Gunakan file laporan AHO yang diekspor langsung dari sistem <strong>IRIS Alfamart</strong>. Sistem akan otomatis mengenali format file tersebut — tidak perlu mengubah apapun.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 — Upload file */}
                    {!isProcessing && !isDone && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Langkah 2: Upload File</p>
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
                                        <span className="text-sm font-medium">{selectedFile.name}</span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                setResult(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">Klik atau seret file .xlsx ke sini</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Progress saat processing */}
                    {isProcessing && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{statusLabel[jobStatus]}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Proses berjalan di server...</span>
                                <span className="font-medium">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                Proses ini membutuhkan beberapa menit. Halaman ini akan otomatis diperbarui setelah selesai.
                            </p>
                        </div>
                    )}

                    {/* Hasil */}
                    {isDone && result && (
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                {result.success && result.errors.length === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : result.success ? (
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <span className="font-medium text-sm">
                                    {result.success ? "Sinkronisasi Selesai" : "Sinkronisasi Gagal"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center">
                                {[
                                    { label: "Tersimpan", value: result.created, color: "text-green-600" },
                                    { label: "Dilewati (Duplikat atau bukan New/Progress)", value: result.skipped, color: "text-yellow-600" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="rounded-md bg-muted/50 p-2">
                                        <p className={`text-lg font-semibold ${color}`}>{value}</p>
                                        <p className="text-[10px] text-muted-foreground">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {(result.errors.length > 0 || result.duplicates.length > 0) && (
                                <div className="max-h-32 overflow-y-auto rounded-md bg-destructive/5 p-3 space-y-1">
                                    {result.duplicates.map((dup, i) => (
                                        <p key={`dup-${i}`} className="text-xs text-amber-600">{dup}</p>
                                    ))}
                                    {result.errors.map((err, i) => (
                                        <p key={`err-${i}`} className="text-xs text-destructive">{err}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Gagal tanpa result detail */}
                    {isDone && !result && jobStatus === "failed" && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <div className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-destructive" />
                                <span className="font-medium text-sm text-destructive">Sinkronisasi Gagal</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Terjadi kesalahan saat memproses file. Silakan coba lagi atau hubungi administrator.
                            </p>
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
                        {isDone ? "Tutup" : "Batal"}
                    </Button>
                    {!isProcessing && !isDone && (
                        <Button
                            type="button"
                            disabled={!selectedFile}
                            onClick={handleImport}
                            className="gap-1.5"
                        >
                            <Upload className="h-4 w-4" />
                            Mulai Import
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
