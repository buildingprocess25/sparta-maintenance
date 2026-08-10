"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { adminCreateAhoTicket, adminUpdateAhoTicket } from "../actions";

type TicketRow = {
    id: string;
    storeCode: string;
    problemNo: string;
    status: string;
    branchCode?: string | null;
    branchName?: string | null;
};

type Props = {
    editTicket?: TicketRow;
    trigger?: React.ReactNode;
};

export function AdminAhoTicketFormDialog({
    editTicket,
    trigger,
}: Props) {
    const isEdit = !!editTicket;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [storeCode, setStoreCode] = useState(editTicket?.storeCode ?? "");
    const [problemNo, setProblemNo] = useState(editTicket?.problemNo ?? "");
    const [status, setStatus] = useState(editTicket?.status ?? "New");
    const [branchCode, setBranchCode] = useState(editTicket?.branchCode ?? "");
    const [branchName, setBranchName] = useState(editTicket?.branchName ?? "");

    function resetForm() {
        if (!isEdit) {
            setStoreCode("");
            setProblemNo("");
            setStatus("New");
            setBranchCode("");
            setBranchName("");
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const missingFields: string[] = [];
        if (!storeCode.trim()) missingFields.push("Kode Toko");
        if (!problemNo.trim()) missingFields.push("No Problem");

        if (missingFields.length > 0) {
            toast.error("Data tiket AHO belum lengkap", {
                description: `Lengkapi field berikut: ${missingFields.join(", ")}.`,
            });
            return;
        }

        startTransition(async () => {
            const result = isEdit
                ? await adminUpdateAhoTicket(editTicket!.id, {
                      storeCode: storeCode.trim(),
                      problemNo: problemNo.trim(),
                      status,
                      branchCode: branchCode.trim() || undefined,
                      branchName: branchName.trim() || undefined,
                  })
                : await adminCreateAhoTicket({
                      storeCode: storeCode.trim(),
                      problemNo: problemNo.trim(),
                      status,
                      branchCode: branchCode.trim() || undefined,
                      branchName: branchName.trim() || undefined,
                  });

            if (result.error) {
                toast.error(
                    isEdit ? "Gagal mengupdate tiket" : "Gagal membuat tiket",
                    {
                        description: result.error,
                    },
                );
                return;
            }

            toast.success(
                isEdit ? "Tiket berhasil diupdate" : "Tiket berhasil dibuat",
                {
                    description: `${storeCode.trim().toUpperCase()} - ${problemNo.trim()}`,
                },
            );
            setOpen(false);
            resetForm();
        });
    }

    return (
        <>
            <LoadingOverlay
                isOpen={isPending}
                message={isEdit ? "Mengupdate tiket..." : "Membuat tiket..."}
            />

            <Dialog
                open={open}
                onOpenChange={(v) => {
                    setOpen(v);
                    if (v && !isEdit) resetForm();
                }}
            >
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Tambah Tiket AHO
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {isEdit ? "Edit Tiket AHO" : "Tambah Tiket AHO"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Ubah data tiket AHO yang dipilih."
                                : "Tambahkan tiket AHO baru ke sistem."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Kode Toko */}
                            <div className="space-y-2">
                                <Label htmlFor="aho-store-code">Kode Toko *</Label>
                                <Input
                                    id="aho-store-code"
                                    value={storeCode}
                                    onChange={(e) => setStoreCode(e.target.value)}
                                    placeholder="Contoh: CKOL"
                                    maxLength={10}
                                    required
                                />
                            </div>

                            {/* No Problem */}
                            <div className="space-y-2">
                                <Label htmlFor="aho-problem-no">No Problem *</Label>
                                <Input
                                    id="aho-problem-no"
                                    value={problemNo}
                                    onChange={(e) => setProblemNo(e.target.value)}
                                    placeholder="Contoh: 12345"
                                    required
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="aho-status">
                                Status Tiket
                            </Label>
                            <Select
                                value={status}
                                onValueChange={setStatus}
                            >
                                <SelectTrigger id="aho-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="New">New</SelectItem>
                                    <SelectItem value="Progress">Progress</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            {/* Kode Cabang Existing */}
                            <div className="space-y-2">
                                <Label htmlFor="aho-branch-code" className="text-muted-foreground">Kode Cabang (opsional)</Label>
                                <Input
                                    id="aho-branch-code"
                                    value={branchCode}
                                    onChange={(e) => setBranchCode(e.target.value)}
                                    placeholder="Contoh: BKS"
                                />
                            </div>

                            {/* Nama Cabang Existing */}
                            <div className="space-y-2">
                                <Label htmlFor="aho-branch-name" className="text-muted-foreground">Nama Cabang (opsional)</Label>
                                <Input
                                    id="aho-branch-name"
                                    value={branchName}
                                    onChange={(e) => setBranchName(e.target.value)}
                                    placeholder="Contoh: BEKASI"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Informasi cabang opsional ini digunakan untuk menyimpan data asli dari Excel jika diperlukan. Jika kosong, sistem akan menggunakan cabang dari master toko.
                        </p>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isEdit ? (
                                    <>
                                        <Pencil className="h-4 w-4 mr-1.5" />
                                        Simpan
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        Tambah
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
