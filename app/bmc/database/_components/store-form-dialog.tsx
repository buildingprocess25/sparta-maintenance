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
import { createStore, updateStore } from "../actions";

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
    isActive: boolean;
};

type Props = {
    branchNames: string[];
    editStore?: StoreRow;
    trigger?: React.ReactNode;
};

export function StoreFormDialog({ branchNames, editStore, trigger }: Props) {
    const isEdit = !!editStore;
    const hasSingleBranch = branchNames.length === 1;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [code, setCode] = useState(editStore?.code ?? "");
    const [name, setName] = useState(editStore?.name ?? "");
    const [branch, setBranch] = useState(
        editStore?.branchName ?? branchNames[0] ?? "",
    );
    const [isActive, setIsActive] = useState(editStore?.isActive ?? true);

    function resetForm() {
        if (!isEdit) {
            setCode("");
            setName("");
            setBranch(branchNames[0] ?? "");
            setIsActive(true);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!code.trim() || !name.trim() || !branch) {
            toast.error("Semua field wajib diisi");
            return;
        }

        startTransition(async () => {
            const result = isEdit
                ? await updateStore(code, {
                      name: name.trim(),
                      branchName: editStore?.branchName ?? branch,
                      isActive,
                  })
                : await createStore({
                      code: code.trim().toUpperCase(),
                      name: name.trim(),
                      branchName: branch,
                      isActive,
                  });

            if (result.error) {
                toast.error(result.error, {
                    description: "detail" in result ? result.detail : undefined,
                });
                return;
            }

            toast.success(
                isEdit ? "Toko berhasil diupdate" : "Toko berhasil dibuat",
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
                                : "Tambahkan toko baru ke cabang Anda."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-code">Kode Toko</Label>
                            <Input
                                id="store-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: CKOL"
                                disabled={isEdit}
                                maxLength={10}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="store-name">Nama Toko</Label>
                            <Input
                                id="store-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Masukkan nama toko"
                                required
                            />
                        </div>

                        {/* Only show branch select if BMC manages multiple branches */}
                        {!hasSingleBranch && !isEdit && (
                            <div className="space-y-2">
                                <Label htmlFor="store-branch">Cabang</Label>
                                <Select
                                    value={branch}
                                    onValueChange={setBranch}
                                >
                                    <SelectTrigger id="store-branch">
                                        <SelectValue placeholder="Pilih cabang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branchNames.map((b) => (
                                            <SelectItem key={b} value={b}>
                                                {b}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="store-status">Status Toko</Label>
                            <Select
                                value={isActive ? "active" : "inactive"}
                                onValueChange={(value) =>
                                    setIsActive(value === "active")
                                }
                            >
                                <SelectTrigger id="store-status">
                                    <SelectValue placeholder="Pilih status toko" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        Aktif
                                    </SelectItem>
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
