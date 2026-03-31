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
import { createUser, updateUser } from "../actions";

type UserRow = {
    NIK: string;
    name: string;
    email: string;
    role: string;
    branchNames: string[];
};

type Props = {
    branchNames: string[];
    editUser?: UserRow;
    trigger?: React.ReactNode;
};

export function UserFormDialog({ branchNames, editUser, trigger }: Props) {
    const isEdit = !!editUser;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [nik, setNik] = useState(editUser?.NIK ?? "");
    const [name, setName] = useState(editUser?.name ?? "");
    const [email, setEmail] = useState(editUser?.email ?? "");
    const [role, setRole] = useState<string>(editUser?.role ?? "BMS");

    function resetForm() {
        if (!isEdit) {
            setNik("");
            setName("");
            setEmail("");
            setRole("BMS");
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!nik.trim() || !name.trim() || !email.trim()) {
            toast.error("Semua field wajib diisi");
            return;
        }

        startTransition(async () => {
            const payload = {
                email: email.trim(),
                name: name.trim(),
                role: role as "BMS" | "BRANCH_ADMIN",
                branchNames,
            };

            const result = isEdit
                ? await updateUser(nik, payload)
                : await createUser({ NIK: nik.trim(), ...payload });

            if (result.error) {
                toast.error(result.error, {
                    description: "detail" in result ? result.detail : undefined,
                });
                return;
            }

            toast.success(isEdit ? "User berhasil diupdate" : "User berhasil dibuat");
            setOpen(false);
            resetForm();
        });
    }

    return (
        <>
            <LoadingOverlay isOpen={isPending} message={isEdit ? "Mengupdate user..." : "Membuat user..."} />

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !isEdit) resetForm(); }}>
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Tambah User
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Edit User" : "Tambah User Baru"}</DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Ubah data user yang dipilih."
                                : "Tambahkan user BMS atau Branch Admin baru."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="user-nik">NIK</Label>
                            <Input
                                id="user-nik"
                                value={nik}
                                onChange={(e) => setNik(e.target.value)}
                                placeholder="Masukkan NIK"
                                disabled={isEdit}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user-name">Nama</Label>
                            <Input
                                id="user-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Masukkan nama"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user-email">Email</Label>
                            <Input
                                id="user-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Masukkan email"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user-role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BMS">BMS</SelectItem>
                                    <SelectItem value="BRANCH_ADMIN">Branch Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
