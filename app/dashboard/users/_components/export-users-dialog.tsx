"use client";

import { useState, useTransition } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Download, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { exportAdminUsers } from "../actions";

const ROLE_OPTIONS = [
    { value: "all", label: "Semua Role" },
    { value: "BMS", label: "BMS" },
    { value: "BMC", label: "BMC" },
    { value: "BNM_MANAGER", label: "BnM Manager" },
    { value: "BRANCH_ADMIN", label: "Branch Admin" },
];

const ROLE_LABELS: Record<string, string> = {
    BMS: "BMS",
    BMC: "BMC",
    BNM_MANAGER: "BnM Manager",
    BRANCH_ADMIN: "Branch Admin",
};

export function ExportUsersDialog({ branches }: { branches: string[] }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [role, setRole] = useState("all");

    function toggleBranch(branch: string, checked: boolean) {
        setSelectedBranches((prev) =>
            checked ? [...prev, branch] : prev.filter((b) => b !== branch),
        );
    }

    const handleExport = () => {
        const toastId = toast.loading("Mengambil data user...");

        startTransition(async () => {
            try {
                const users = await exportAdminUsers({
                    selectedBranches,
                    role,
                });

                if (users.length === 0) {
                    toast.warning("Tidak ada data untuk diekspor", {
                        id: toastId,
                    });
                    return;
                }

                // Build worksheet rows
                const rows = users.map((u) => ({
                    NIK: u.NIK,
                    Nama: u.name,
                    Email: u.email,
                    Role: ROLE_LABELS[u.role] ?? u.role,
                    Cabang: u.branchNames.join(", "),
                }));

                const ws = XLSX.utils.json_to_sheet(rows);
                ws["!cols"] = [
                    { wch: 15 },
                    { wch: 30 },
                    { wch: 35 },
                    { wch: 14 },
                    { wch: 30 },
                ];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Data User");
                XLSX.writeFile(
                    wb,
                    `Data_User_SPARTA_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`,
                );

                toast.success(`${users.length} user berhasil diekspor`, {
                    id: toastId,
                });
                setOpen(false);
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Gagal mengekspor data";
                toast.error(message, { id: toastId });
            }
        });
    };

    const branchLabel =
        selectedBranches.length === 0
            ? "Semua Cabang"
            : selectedBranches.length === 1
              ? selectedBranches[0]
              : `${selectedBranches.length} Cabang Dipilih`;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 text-xs h-8">
                    <Download className="w-4 h-4" />
                    Ekspor XLSX
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ekspor Data User</DialogTitle>
                    <DialogDescription>
                        Pilih filter data user yang ingin diekspor ke Excel.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    {/* Multiple branches */}
                    <div className="grid gap-2">
                        <Label>Cabang</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal text-sm px-3 h-10"
                                >
                                    {branchLabel}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-64 overflow-y-auto w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                <DropdownMenuCheckboxItem
                                    checked={selectedBranches.length === 0}
                                    onCheckedChange={(c) => {
                                        if (c) setSelectedBranches([]);
                                    }}
                                >
                                    Semua Cabang
                                </DropdownMenuCheckboxItem>
                                {branches.map((b) => (
                                    <DropdownMenuCheckboxItem
                                        key={b}
                                        checked={selectedBranches.includes(b)}
                                        onCheckedChange={(c) =>
                                            toggleBranch(b, c)
                                        }
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {b}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Role filter */}
                    <div className="grid gap-2">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Semua Role" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                    >
                        Batal
                    </Button>
                    <Button onClick={handleExport} disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Unduh File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
