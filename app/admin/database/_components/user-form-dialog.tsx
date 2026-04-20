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
import { adminCreateUser, adminUpdateUser } from "../actions";

const ROLE_OPTIONS = [
    { value: "BMS", label: "BMS" },
    { value: "BMC", label: "BMC" },
    { value: "BNM_MANAGER", label: "BnM Manager" },
    { value: "BRANCH_ADMIN", label: "Branch Admin" },
    { value: "ADMIN", label: "Admin Pusat" },
] as const;

/** Role yang tidak membutuhkan branch */
const ROLES_WITHOUT_BRANCH = ["ADMIN"];

type UserRow = {
    NIK: string;
    name: string;
    email: string;
    role: string;
    branchNames: string[];
};

type Props = {
    allBranchNames: string[];
    editUser?: UserRow;
    trigger?: React.ReactNode;
};

export function AdminUserFormDialog({
    allBranchNames,
    editUser,
    trigger,
}: Props) {
    const isEdit = !!editUser;
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [nik, setNik] = useState(editUser?.NIK ?? "");
    const [name, setName] = useState(editUser?.name ?? "");
    const [email, setEmail] = useState(editUser?.email ?? "");
    const [role, setRole] = useState(editUser?.role ?? "BMS");
    const [branchInput, setBranchInput] = useState(
        editUser?.branchNames.join(", ") ?? "",
    );

    const needsBranch = !ROLES_WITHOUT_BRANCH.includes(role);

    function resetForm() {
        if (!isEdit) {
            setNik("");
            setName("");
            setEmail("");
            setRole("BMS");
            setBranchInput("");
        }
    }

    function parseBranchNames(input: string): string[] {
        return input
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const missingFields: string[] = [];
        if (!nik.trim()) missingFields.push("NIK");
        if (!name.trim()) missingFields.push("Nama");
        if (!email.trim()) missingFields.push("Email");
        if (needsBranch && !branchInput.trim()) missingFields.push("Branch");

        if (missingFields.length > 0) {
            toast.error("Data user belum lengkap", {
                description: `Lengkapi field berikut: ${missingFields.join(", ")}.`,
            });
            return;
        }

        const branchNames = needsBranch ? parseBranchNames(branchInput) : [];

        startTransition(async () => {
            const payload = {
                email: email.trim(),
                name: name.trim(),
                role: role as (typeof ROLE_OPTIONS)[number]["value"],
                branchNames,
            };

            const result = isEdit
                ? await adminUpdateUser(nik, payload)
                : await adminCreateUser({ NIK: nik.trim(), ...payload });

            if (result.error) {
                const failureReason =
                    "detail" in result ? result.detail : result.error;
                toast.error(
                    isEdit ? "Gagal mengupdate user" : "Gagal membuat user",
                    {
                        description: `${failureReason ?? result.error}. NIK: ${nik.trim()}.`,
                    },
                );
                return;
            }

            toast.success(
                isEdit ? "User berhasil diupdate" : "User berhasil dibuat",
                {
                    description: `${name.trim()} • ${role}${branchNames.length > 0 ? ` • ${branchNames.join(", ")}` : ""}`,
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
                message={isEdit ? "Mengupdate user..." : "Membuat user..."}
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
                            Tambah User
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {isEdit ? "Edit User" : "Tambah User Baru"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Ubah data user yang dipilih."
                                : "Tambahkan user baru dengan role apapun."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* NIK */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-user-nik">NIK</Label>
                            <Input
                                id="admin-user-nik"
                                value={nik}
                                onChange={(e) => setNik(e.target.value)}
                                placeholder="Masukkan NIK"
                                disabled={isEdit}
                                required
                            />
                        </div>

                        {/* Nama */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-user-name">Nama</Label>
                            <Input
                                id="admin-user-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Masukkan nama"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-user-email">Email</Label>
                            <Input
                                id="admin-user-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Masukkan email"
                                required
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-user-role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="admin-user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={r.value}
                                        >
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Branch — hidden for ADMIN role */}
                        {needsBranch && (
                            <div className="space-y-2">
                                <Label htmlFor="admin-user-branch">
                                    Branch
                                </Label>
                                <Input
                                    id="admin-user-branch"
                                    value={branchInput}
                                    onChange={(e) =>
                                        setBranchInput(e.target.value)
                                    }
                                    placeholder={
                                        allBranchNames[0]
                                            ? `Contoh: ${allBranchNames[0]}`
                                            : "Nama branch"
                                    }
                                    list="admin-branch-suggestions"
                                    required={needsBranch}
                                />
                                {/* Datalist for autocomplete suggestions */}
                                <datalist id="admin-branch-suggestions">
                                    {allBranchNames.map((b) => (
                                        <option key={b} value={b} />
                                    ))}
                                </datalist>
                            </div>
                        )}

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
