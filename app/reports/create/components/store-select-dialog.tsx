"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StoreOption } from "./types";

interface StoreSelectDialogProps {
    open: boolean;
    stores: StoreOption[];
    selectedStoreCode: string;
    onStoreChange: (storeCode: string) => void;
    onCancel: () => void;
}

export function StoreSelectDialog({
    open,
    stores,
    selectedStoreCode,
    onStoreChange,
    onCancel,
}: StoreSelectDialogProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Pilih Toko</AlertDialogTitle>
                    <AlertDialogDescription>
                        Pilih toko yang akan diinspeksi untuk memulai laporan
                        baru.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="store-dialog" className="text-sm">
                        Toko <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        onValueChange={onStoreChange}
                        value={selectedStoreCode}
                    >
                        <SelectTrigger
                            className="mt-2 w-full"
                            id="store-dialog"
                        >
                            <SelectValue placeholder="Pilih toko..." />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map((s) => (
                                <SelectItem key={s.code} value={s.code}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <AlertDialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Batal
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
