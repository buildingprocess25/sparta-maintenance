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
import { adminCreateStore, adminUpdateStore } from "../actions";

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type Props = {
    allBranchNames: string[];
    editStore?: StoreRow;
    trigger?: React.ReactNode;
};

export function AdminStoreFormDialog({
    allBranchNames,
    editStore,
    trigger,
}: Props) {
    const isEdit = !!editStore;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [code, setCode] = useState(editStore?.code ?? "");
    const [name, setName] = useState(editStore?.name ?? "");
    const [branch, setBranch] = useState(
        editStore?.branchName ?? allBranchNames[0] ?? "",
    );
    const [isActive, setIsActive] = useState(editStore?.isActive ?? true);

    function resetForm() {
        if (!isEdit) {
            setCode("");
            setName("");
            setBranch(allBranchNames[0] ?? "");
            setIsActive(true);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const missingFields: string[] = [];
        if (!code.trim()) missingFields.push("Kode Toko");
        if (!name.trim()) missingFields.push("Nama Toko");
        if (!branch) missingFields.push("Cabang");

        if (missingFields.length > 0) {
            toast.error("Data toko belum lengkap", {
                description: `Lengkapi field berikut: ${missingFields.join(", ")}.`,
            });
            return;
        }

        startTransition(async () => {
            const result = isEdit
                ? await adminUpdateStore(code, {
                      name: name.trim(),
                      branchName: branch,
                      isActive,
                  })
                : await adminCreateStore({
                      code: code.trim().toUpperCase(),
                      name: name.trim(),
                      branchName: branch,
                      isActive,
                  });

            if (result.error) {
                const failureReason =
                    "detail" in result ? result.detail : result.error;
                toast.error(
                    isEdit ? "Gagal mengupdate toko" : "Gagal membuat toko",
                    {
                        description: `${failureReason ?? result.error}. Kode: ${code.trim().toUpperCase()}.`,
                    },
                );
                return;
            }

            toast.success(
                isEdit ? "Toko berhasil diupdate" : "Toko berhasil dibuat",
                {
                    description: `${code.trim().toUpperCase()} • ${name.trim()} • ${branch} • ${isActive ? "Aktif" : "Nonaktif"}`,
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
                message={isEdit ? "Mengupdate toko..." : "Membuat toko..."}
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
                            Tambah Toko
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {isEdit ? "Edit Toko" : "Tambah Toko Baru"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Ubah data toko yang dipilih."
                                : "Tambahkan toko baru ke sistem."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Kode Toko */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-store-code">Kode Toko</Label>
                            <Input
                                id="admin-store-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: CKOL"
                                disabled={isEdit}
                                maxLength={10}
                                required
                            />
                        </div>

                        {/* Nama Toko */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-store-name">Nama Toko</Label>
                            <Input
                                id="admin-store-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Masukkan nama toko"
                                required
                            />
                        </div>

                        {/* Cabang — always shown for admin (admin can assign any branch) */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-store-branch">Cabang</Label>
                            <Select value={branch} onValueChange={setBranch}>
                                <SelectTrigger id="admin-store-branch">
                                    <SelectValue placeholder="Pilih cabang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allBranchNames.map((b) => (
                                        <SelectItem key={b} value={b}>
                                            {b}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-store-status">
                                Status Toko
                            </Label>
                            <Select
                                value={isActive ? "active" : "inactive"}
                                onValueChange={(v) =>
                                    setIsActive(v === "active")
                                }
                            >
                                <SelectTrigger id="admin-store-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="inactive">
                                        Nonaktif
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
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
